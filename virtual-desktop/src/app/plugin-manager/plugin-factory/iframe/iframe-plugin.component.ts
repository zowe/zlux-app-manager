/*s program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { AfterViewInit, OnDestroy, Inject, Component, Optional } from '@angular/core';
import { Angular2InjectionTokens, Angular2PluginWindowActions, Angular2PluginWindowEvents, Angular2PluginViewportEvents } from 'pluginlib/inject-resources';

@Component({
  templateUrl: './iframe-plugin.component.html'
})
export class IFramePluginComponent implements AfterViewInit, OnDestroy {
  
  private resources: IFrameMVDResources;
  
  private functionMap = new Map<string, any>();
  constructor(
    @Optional() @Inject(Angular2InjectionTokens.MAIN_WINDOW_ID) mainWindowId: MVDWindowManagement.WindowId | null,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_ACTIONS) windowActions: Angular2PluginWindowActions | null,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_EVENTS) windowEvents: Angular2PluginWindowEvents | null,
    @Inject(Angular2InjectionTokens.VIEWPORT_EVENTS) viewportEvents: Angular2PluginViewportEvents,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) pluginDefinition: MVDHosting.DesktopPluginDefinition,
    @Inject(Angular2InjectionTokens.LOGGER) logger: ZLUX.ComponentLogger,
    @Inject(Angular2InjectionTokens.LAUNCH_METADATA) launchMetadata: any
  ) {
    this.resources = {
      mainWindowId: mainWindowId,
      windowActions: windowActions,
      windowEvents: windowEvents,
      viewportEvents: viewportEvents,
      logger: logger,
      pluginDefinition: pluginDefinition,
      launchMetadata: launchMetadata
    };
    this.receiveMessage = this.receiveMessage.bind(this);
    addEventListener('message', this.receiveMessage, false);
    this.functionMap.set('windowActions', this.resources.windowActions);
  }

  ngAfterViewInit(): void {


    this.resources.windowEvents!.minimized.subscribe((res) => {
       console.log('Minimize Event Recieved');
    });
    this.resources.windowEvents!.restored.subscribe((res) => {
       console.log('Restore Event Recieved');
    });
    this.resources.windowEvents!.moved.subscribe((res) => {
       console.log('Moved Event Recieved');
    });
    this.resources.windowEvents!.resized.subscribe((res) => {
       console.log('Resized Event Recieved');
    });

    this.resources.windowEvents!.titleChanged.subscribe((res) => {
       console.log('Title Change Event Recieved');
    });
  }

  ngOnDestroy(): void {
  }
//Constructs a function call from the input
  resolve(prefix: string, path: string): any {
    return path.split('.').reduce((obj: any, nextPart: string, i: number) => {
      let res;
      if (i === 0) {
        if (nextPart === 'ZoweZLUX') {
          res = ZoweZLUX;
        } else if (nextPart === 'windowActions') {
          res = this.resources.windowActions;
        } else if (nextPart === 'windowEvents') {
          res = this.resources.windowEvents;
        } else {
          res = this.functionMap.get(`${prefix}-${nextPart}`);
        }
      } else if (obj[nextPart] !== undefined) {
        res = obj[nextPart];
        if (typeof(res) === 'function') {
          res = res.bind(obj);
        }
      }
      for (const a in res) {
        if (!res.hasOwnProperty(a)) {
          continue;
        }

      }
      if (res !== undefined) {
        return res;
      }
      console.log('NEXT ERROR', nextPart);

      throw new ReferenceError(`${nextPart} of ${path} does not exist`);
    }, undefined);
  }
//Takes in messages and rejects those that are intended for another location
  receiveMessage(event: any): void {
    const { data } = event;
    if (!data.data) {
      return;
    }
    if (!data.data.factory) {
      return;
    }
    if (data.origin && data.origin === 'zowe') {
      return;
    }
    const prefix = event.origin.replace(/\./g, '_');
    let result;
    const action = data.data && data.data.action;
    let resolvedAction;
    try {
      resolvedAction = action && this.resolve(prefix, action);
    } catch (e) {
      console.log(`Error in performing action: ${e}` );
    }
    const params = data.data && data.data.params;
    if (resolvedAction !== undefined) {
      if (typeof(resolvedAction) === 'function') {
        result = resolvedAction(...params)
      } else {
        result = resolvedAction;
      }
      if (data.data.saveResult === true) {
        if (data.data.saveKey) {
          const saveKey = `${prefix}-${data.data.saveKey}`;
          this.functionMap.set(saveKey, result);
        } else {
          console.log('Please provide a save key');
        }
        result = 'Complete';
      }
    }


      event.source.postMessage({
        key: data.key,
        value: result,
        origin: 'zowe',
      }, '*');

  }
}


interface IFrameMVDResources {
  readonly mainWindowId: MVDWindowManagement.WindowId | null;
  readonly windowActions: Angular2PluginWindowActions | null;
  readonly windowEvents: Angular2PluginWindowEvents | null;
  readonly viewportEvents: Angular2PluginViewportEvents;
  readonly logger: ZLUX.ComponentLogger;
  readonly pluginDefinition: MVDHosting.DesktopPluginDefinition;
  readonly launchMetadata: any;
};




/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

