
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { ViewChild, ElementRef, AfterViewInit, OnDestroy, InjectionToken, Inject, Component, Optional } from '@angular/core';

import { ReactMVDResources } from 'pluginlib/react-inject-resources';
import { Angular2InjectionTokens, Angular2PluginWindowActions, Angular2PluginWindowEvents, 
  Angular2PluginSessionEvents, Angular2PluginViewportEvents, Angular2PluginThemeEvents } from 'pluginlib/inject-resources';

interface MvdNativeReactPlugin {
  renderPlugin: (domElement: HTMLElement, resources: ReactMVDResources) => void;
  unmountPlugin?: (domElement: HTMLElement) => void;
}

export const ReactEntryHook = new InjectionToken<MvdNativeReactPlugin>('react-entry-hook');

@Component({
  templateUrl: './react-plugin.component.html'
})
export class ReactPluginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container') element: ElementRef;
  resources: ReactMVDResources;

  constructor(
    @Inject(ReactEntryHook) private reactEntryHook: MvdNativeReactPlugin,
    @Optional() @Inject(Angular2InjectionTokens.MAIN_WINDOW_ID) mainWindowId: MVDWindowManagement.WindowId | null,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_ACTIONS) windowActions: Angular2PluginWindowActions | null,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_EVENTS) windowEvents: Angular2PluginWindowEvents | null,
    @Inject(Angular2InjectionTokens.VIEWPORT_EVENTS) viewportEvents: Angular2PluginViewportEvents,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) pluginDefinition: MVDHosting.DesktopPluginDefinition,
    @Inject(Angular2InjectionTokens.LOGGER) logger: ZLUX.ComponentLogger,
    @Inject(Angular2InjectionTokens.LAUNCH_METADATA) launchMetadata: any,
    @Inject(Angular2InjectionTokens.INSTANCE_ID) instanceId: MVDHosting.InstanceId,
    @Inject(Angular2InjectionTokens.SESSION_EVENTS) sessionEvents: Angular2PluginSessionEvents,
    @Optional() @Inject(Angular2InjectionTokens.THEME_EVENTS) themeEvents: Angular2PluginThemeEvents
  ) {
    this.resources = {
      mainWindowId: mainWindowId,
      windowActions: windowActions,
      windowEvents: windowEvents,
      viewportEvents: viewportEvents,
      logger: logger,
      pluginDefinition: pluginDefinition,
      launchMetadata: launchMetadata,
      instanceId: instanceId,
      sessionEvents: sessionEvents,
      themeEvents: themeEvents
    };
  }

  ngAfterViewInit(): void {
    /* Unpleasantry... https://github.com/angular/angular/issues/6005 */
    setTimeout(() => {
      this.reactEntryHook.renderPlugin(this.element.nativeElement, this.resources);
    });
  }

  ngOnDestroy(): void {
    if (this.reactEntryHook.unmountPlugin != null) {
      this.reactEntryHook.unmountPlugin(this.element.nativeElement);
    }
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
