/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { AfterViewInit, Inject, Component, Optional } from '@angular/core';
import { Angular2InjectionTokens, Angular2PluginWindowActions, Angular2PluginWindowEvents, Angular2PluginViewportEvents } from '../../../../pluginlib/inject-resources';

@Component({
    templateUrl: './iframe-plugin.component.html'
})

export class IFramePluginComponent implements AfterViewInit {

  private mainWindowId: MVDWindowManagement.WindowId | null;
  private windowActions: Angular2PluginWindowActions | null;
  private windowEvents: Angular2PluginWindowEvents | null;
  private viewportEvents: Angular2PluginViewportEvents;

  constructor(
    @Optional() @Inject(Angular2InjectionTokens.MAIN_WINDOW_ID) mainWindowId: MVDWindowManagement.WindowId | null,
    @Optional() @Inject(Angular2InjectionTokens.MAIN_WINDOW_ID) windowActions: Angular2PluginWindowActions | null,
    @Optional() @Inject(Angular2InjectionTokens.MAIN_WINDOW_ID) windowEvents: Angular2PluginWindowEvents | null,
    @Inject(Angular2InjectionTokens.VIEWPORT_EVENTS) viewportEvents: Angular2PluginViewportEvents,
  ){
    addEventListener('message', this.postMessageListener.bind(this));
    this.mainWindowId = mainWindowId;
    this.windowActions = windowActions;
    this.windowEvents = windowEvents;
    this.viewportEvents = viewportEvents;
  }

  ngAfterViewInit(): void {
      this.mainWindowId;
      this.windowActions;
      this.windowEvents;
      this.viewportEvents;
  }

  postMessageListener(message: any): void {
    if(!message.data.request || !message.data.request.function || message.data.key === undefined){
      return;
    }
    console.log('postMessageListener() - received translation request for: ', message.data.request.function)
    this.resolvePromisesRecursively(this.translateFunction(message)).then(res => {
      message.source.postMessage({
        key: message.data.key,
        value: res,
        originCall: message.data.request.function
      }, '*');
    });
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

  private translateFunction(message: any){
    let args = message.data.request.args || [];
    let fnString: string = message.data.request.function;
    let source: any = message.source;
    let split: Array<string> = fnString.split('.');
    let fn: Function;
    let fnRet: any;
    console.log('(backend) translateFunction() - translating: ', fnString);
    if(split.length > 0){
      if(split[0] === 'ZoweZLUX'){
        split.shift();
        fn = (this.getAttrib(Object.assign({}, ZoweZLUX), split.join('.')) as Function);
        if(typeof fn === 'function'){
          switch(split[0]){
            case 'pluginManager':
              fn = fn.bind(ZoweZLUX.pluginManager);
              break;
            case 'uriBroker':
              fn = fn.bind(ZoweZLUX.uriBroker);
              break;
            case 'dispatcher':
              fn = fn.bind(ZoweZLUX.dispatcher);
              break;
            case 'logger':
              fn = fn.bind(ZoweZLUX.logger);
              break;
            case 'registry':
              fn = fn.bind(ZoweZLUX.registry);
              break;
            case 'notificationManager':
              fn = fn.bind(ZoweZLUX.notificationManager);
              break;
            case 'globalization':
              fn = fn.bind(ZoweZLUX.globalization);
              break;
            default:
              return undefined;
          }
          if(args.length === 0){
            fnRet = fn();
          } else {
            for(let i = 0; i < args.length; i++){
              if(args[i] == 'this'){
                args[i] = source;
              }
            }
            fnRet = fn(...args);
          }
          return fnRet;
        } else {
          //Not a function within ZoweZLUX
          return undefined;
        }
      } else {
        //some function that doesnt begin with ZoweZLUX
        return undefined;
      }
    }
  }
}