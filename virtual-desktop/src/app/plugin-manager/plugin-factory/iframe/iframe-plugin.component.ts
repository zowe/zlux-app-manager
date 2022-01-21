/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable, Inject, Component, Optional } from '@angular/core';
import { Angular2InjectionTokens, Angular2PluginWindowActions, Angular2PluginWindowEvents, 
  Angular2PluginSessionEvents, Angular2PluginViewportEvents, Angular2PluginThemeEvents } from '../../../../pluginlib/inject-resources';
import { SafeResourceUrl } from '@angular/platform-browser';
import { BaseLogger } from '../../../../app/shared/logger'

@Component({
    templateUrl: './iframe-plugin.component.html'
})

@Injectable()
export class IFramePluginComponent {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  startingPage: SafeResourceUrl;
  iframeId: string;
  instanceId: number = -1;
  frameSource: any;
  responses: any = {};
  DEFAULT_CLOSE_TIMEOUT: number = 5000;

  constructor(
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_ACTIONS) private windowActions: Angular2PluginWindowActions,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_EVENTS) private windowEvents: Angular2PluginWindowEvents,
    @Inject(Angular2InjectionTokens.VIEWPORT_EVENTS) private viewportEvents: Angular2PluginViewportEvents,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefintion: ZLUX.ContainerPluginDefinition,
    @Inject(Angular2InjectionTokens.LAUNCH_METADATA) private launchMetadata: any,
    @Inject(Angular2InjectionTokens.SESSION_EVENTS) private sessionEvents: Angular2PluginSessionEvents,
    @Optional() @Inject(Angular2InjectionTokens.THEME_EVENTS) private themeEvents: Angular2PluginThemeEvents
  ){
    addEventListener("message", this.postMessageListener.bind(this));
    //The following references are to suppress typescript warnings
    this.iFrameMouseOver;
  }

  private postWindowEvent(originCall: string){
    this.frameSource.postMessage({
      key: -1,
      originCall: originCall,
      instanceId: this.instanceId
    }, '*')
  }
  
  private postMessageListener(message: any): void {
    if(!message.data.request || !message.data.request.function || message.data.key === undefined
        || message.data.request.instanceId === undefined){
      return;
    }
    let data: any = message.data;
    let key: number = message.data.key;
    let fnString: string = data.request.function;
    let split: Array<string> = fnString.split('.');
    if(split[0] === 'registerAdapterInstance' && this.instanceId == -1){
      this.instanceId = data.request.instanceId;
      this.frameSource = message.source;
      try{
        this.frameSource.postMessage({
          key: -1,
          constructorData: {
            pluginDef: JSON.parse(JSON.stringify(this.pluginDefintion)),
            launchMetadata: this.launchMetadata
          },
          instanceId: this.instanceId
        }, '*')
      }catch(e){
        this.frameSource.postMessage({
          key: -1,
          constructorData: {
            pluginDef: {},
            launchMetadata: this.launchMetadata
          },
          instanceId: this.instanceId,
          error: 'Unable to parse plugin definition'
        }, '*');
        this.logger.warn("ZWED5172W", e); //this.logger.warn('Unable to parse plugin definition.  Error: ', e);
      }
      this.windowEvents.minimized.subscribe(() => {
        this.postWindowEvent('windowEvents.minimized');
      });
      this.windowEvents.maximized.subscribe(() => {
        this.postWindowEvent('windowEvents.maximized');
      });
      this.windowEvents.restored.subscribe(() => {
        this.postWindowEvent('windowEvents.restored');
      });
      this.windowEvents.moved.subscribe(() => {
        this.postWindowEvent('windowEvents.moved');
      });
      this.windowEvents.resized.subscribe(() => {
        this.postWindowEvent('windowEvents.resized');
      });
      this.windowEvents.titleChanged.subscribe(() => {
        this.postWindowEvent('windowEvents.titleChanged');
      });
      this.sessionEvents.login.subscribe(() => {
        this.postWindowEvent('sessionEvents.login')
      });
      this.sessionEvents.sessionExpire.subscribe(() => {
        this.postWindowEvent('sessionEvents.sessionExpire')
      });
      this.themeEvents.colorChanged.subscribe(() => {
        this.postWindowEvent('themeEvents.colorChanged')
      });
      this.themeEvents.sizeChanged.subscribe(() => {
        this.postWindowEvent('themeEvents.sizeChanged')
      });
      this.themeEvents.wallpaperChanged.subscribe(() => {
        this.postWindowEvent('themeEvents.wallpaperChanged')
      });
      this.sessionEvents.autosaveEmitter.subscribe(() => {
        this.postWindowEvent('sessionEvents.saveData')
      });
      return;
    }
    if(data.request.instanceId === this.instanceId){
      this.resolvePromisesRecursively(this.translateFunction(message)).then(res => {
        message.source.postMessage({
          key: key,
          value: res,
          originCall: data.request.function,
          instanceId: data.request.instanceId
        }, '*');
      });
    }
    return;
  }

  private resolvePromisesRecursively(p: any){
    if(p instanceof Promise){
      return p.then(res => {
        this.resolvePromisesRecursively(res);
      })
    } else {
      return Promise.resolve(p);
    }
  }

  private getAttrib(object: object, path: string){
    if(object === undefined || path === undefined || 
      typeof path !== 'string' || typeof object !== 'object') return undefined;
    let objCopy: object = Object.assign({}, object);
    try{
      let props = (path || '').split('.');
      for(let i = 0; i < props.length; i++){
        objCopy = (objCopy as any)[props[i]];
      }
    }catch(e){
      return undefined;
    }
    return (objCopy === undefined) ? undefined : objCopy;
  }

  private addActionsToContextMenu(key: number, source: any, itemsArray: Array<any>, type: string){
    try{
      let copy = JSON.parse(JSON.stringify(itemsArray));
      for(let i = 0; i < copy.length; i++){
        copy[i].action = () => {
          source.postMessage({
            key: key,
            originCall: type+'.spawnContextMenu',
            instanceId: this.instanceId,
            contextMenuItemIndex: i
          }, '*')
        }
      }
      return copy;
    }catch(e){
      this.logger.warn('ZWED5151E', e); //this.logger.warn('Unable to parse context menu items.  Error: ', e);
      return undefined;
    }
  }

  private windowActionsHandler(fnSplit: Array<string>, args: Array<any>, message: any){
    let fn: Function;
    let fnRet: any;
    let fnString: string = message.data.request.function;
    fn = (this.getAttrib(Object.assign({}, this.windowActions), fnSplit.join('.')) as Function);
    if(typeof fn === 'function'){
      fn = fn.bind(this.windowActions);
      if(args.length === 0){
        fnRet = fn();
      } else {
        if(fnString == 'windowActions.spawnContextMenu' && Array.isArray(args[2])){
          args[2] = this.addActionsToContextMenu(message.data.key, message.source, args[2], 'windowActions')
        }
        fnRet = fn(...args);
      }
      return fnRet;
    } else {
      return undefined;
    }
  }

  private viewportEventsHandler(fnSplit: Array<string>, args: Array<any>, message: any){
    let fn: Function;
    let fnString: string = message.data.request.function;
    fn = (this.getAttrib(Object.assign({}, this.viewportEvents), fnSplit.join('.')) as Function);
    if(typeof fn === 'function'){
      fn = fn.bind(this.viewportEvents);
      if(fnString === 'viewportEvents.registerCloseHandler' && args.length === 1){
        let that = this;
        args[0] = function(): Promise<void>{
          return new Promise(function(resolve: any, reject: any){
            that.responses[message.data.key] = {
              resolve: function(){
                resolve();
              }
            }
            message.source.postMessage({
              key: message.data.key,
              originCall: 'viewportEvents.callCloseHandler',
              instanceId: that.instanceId
            }, '*')
            setTimeout(() => {
              resolve();
            }, that.DEFAULT_CLOSE_TIMEOUT)
          }.bind(this))
        }
        return fn(...args);
      } else if(fnString == 'viewportEvents.spawnContextMenu' && Array.isArray(args[2])){
        args[2] = this.addActionsToContextMenu(message.data.key, message.source, args[2], 'viewportEvents');
        return fn(...args);
      }
      return undefined;
    }
    return undefined;
  }

  private zoweZLUXHandler(split: Array<string>, args: Array<any>, message: any){
    let fn: Function;
    let fnRet: any;
    let fnString: string = message.data.request.function;
    let instanceId: number = message.data.request.instanceId;
    // TODO: This looks like Iframe handler workaround code. Is this still relevant?
    let fakeHMA = function(this: any, key: any, notification: any){
      try {
        message.source.postMessage({
          key: key,
          originCall: 'handleMessageAdded',
          notification: notification,
          instanceId: instanceId
        }, '*')
      } catch (e) { /* TODO: Every once in a while, message.source won't exist after app2app. 
        This could be a timing issue with the echoes or at least, doesn't seem to affect app2app. */
        this.logger.warn("ZWED5199W", 'handleMessageAdded'); //this.logger.warn("Attempted to postMessage for type %s without source", e);
      }
    }
    let fakeHMR = function(this: any, key: any, notificationId: any){
      try {
        message.source.postMessage({
          key: key,
          originCall: 'handleMessageRemoved',
          notificationId: notificationId,
          instanceId: instanceId
        }, '*')
      } catch (e) { /* TODO: Every once in a while, message.source won't exist after app2app. 
        This could be a timing issue with the echoes or at least, doesn't seem to affect app2app. */
        this.logger.warn("ZWED5199W", 'handleMessageRemoved'); //this.logger.warn("Attempted to postMessage for type %s without source", e);
      }
    }
    fn = (this.getAttrib(Object.assign({}, ZoweZLUX), split.join('.')) as Function);
    if(typeof fn === 'function'){
      fn = fn.bind((ZoweZLUX as any)[split[0]]);
      if(args.length === 0){
        fnRet = fn();
      } else {
        if(fnString === 'ZoweZLUX.notificationManager.addMessageHandler'){
          args[0] = {
            handleMessageAdded(notification: any){
              fakeHMA(message.data.key, notification);
            },
            handleMessageRemoved(id: any){
              fakeHMR(message.data.key, id);
            }
          }
        }
        fnRet = fn(...args);
      }
      return fnRet;
    } else {
      return undefined;
    }
  }

  private translateFunction(message: any){
    let args = message.data.request.args || [];
    let fnString: string = message.data.request.function;
    let split: Array<string> = fnString.split('.');
    if(split.length > 0){
      switch(split[0]){
        case 'ZoweZLUX':
          split.shift();
          return this.zoweZLUXHandler(split, args, message);
        case 'windowActions':
          split.shift();
          return this.windowActionsHandler(split, args, message);
        case 'viewportEvents':
          split.shift();
          return this.viewportEventsHandler(split, args, message);
        case 'resolveCloseHandler':
          if(this.responses[args[0]]){
            this.responses[args[0]].resolve();
          }
          return undefined;
        default:
          return undefined;
      }
    }
  }

  iFrameMouseOver(event: any){}
}
