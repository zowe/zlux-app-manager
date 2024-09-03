

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';
import { Viewport } from './viewport';
// import { InstanceId } from '../application-instance';
import { BaseLogger } from 'virtual-desktop-logger';

@Injectable()
export class ViewportManager implements MVDHosting.ViewportManagerInterface {
  private viewports: Map<MVDHosting.ViewportId, Viewport>;
  private viewportInstances: Map<MVDHosting.ViewportId, MVDHosting.InstanceId>;
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private closeHandlers: Map<MVDHosting.ViewportId, Array<() => Promise<any>>>;
  constructor() {
    this.viewports = new Map();
    this.viewportInstances = new Map();
    this.closeHandlers = new Map();
  }

  createViewport(providersProvider: any): MVDHosting.ViewportId {
    const viewport = new Viewport(providersProvider);
    this.viewports.set(viewport.viewportId, viewport);

    return viewport.viewportId;
  }

  registerViewport(viewportId: MVDHosting.ViewportId, instanceId: MVDHosting.InstanceId): void {
    if (this.viewportInstances.has(viewportId)) {
      this.logger.warn("ZWED5161W", viewportId); //this.logger.warn('Attempting to replace an existing viewport id=${viewportId} in registration ');
    }

    this.viewportInstances.set(viewportId, instanceId);
  }

  registerViewportCloseHandler(viewportId: MVDHosting.ViewportId, handler: () => Promise<any>):void {
    let handlers = this.closeHandlers.get(viewportId);
    if (!handlers) {
      handlers = new Array<() => Promise<any>>();
      this.closeHandlers.set(viewportId, handlers);
    }
    handlers.push(handler);
  }

  private closeWatcherLoop(pos: number, handlers: Array<() => Promise<any>>, finishedCallback: any, rejectCallback: any): void {
    if (pos >= handlers.length) {
      finishedCallback();
    } else {
      handlers[pos]().then(()=> {
        this.closeWatcherLoop(++pos, handlers, finishedCallback, rejectCallback);
      }).catch((reason:any)=> {
        rejectCallback();
      });
    }
  }

  destroyViewport(viewportId: MVDHosting.ViewportId): Promise<any> {
    // TODO there may be other actions desired for destroyviewport
    this.logger.info(`ZWED5044I`, viewportId); /*this.logger.info(`Closing viewport ID=${viewportId}`);*/
    return new Promise((resolve,reject)=> {
      let handlers = this.closeHandlers.get(viewportId);
      if (handlers) {
        this.closeWatcherLoop(0,handlers,()=> {
          resolve(null);
        }, (reason:any)=> {
          reject(reason);
        });
      } else {
        resolve(null);
      }
    });
  }

  getApplicationInstanceId(viewportId: MVDHosting.ViewportId): MVDHosting.InstanceId | null {
    const id = this.viewportInstances.get(viewportId);

    if (id != null) {
      return id;
    } else {
      return null;
    }
  }

  getViewport(viewportId: MVDHosting.ViewportId): Viewport | null {
    return this.viewports.get(viewportId) || null;
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

