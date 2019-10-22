/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable, Inject, Component, Optional } from '@angular/core';
import { Angular2InjectionTokens, Angular2PluginWindowActions, Angular2PluginWindowEvents, Angular2PluginViewportEvents } from '../../../../pluginlib/inject-resources';
import { SafeResourceUrl } from '@angular/platform-browser';

@Component({
    templateUrl: './iframe-plugin.component.html'
})

@Injectable()
export class IFramePluginComponent {
  startingPage: SafeResourceUrl;
  iframeId: string;
  instanceId: number = -1;

  constructor(
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_ACTIONS) private windowActions: Angular2PluginWindowActions,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_EVENTS) private windowEvents: Angular2PluginWindowEvents,
    @Inject(Angular2InjectionTokens.VIEWPORT_EVENTS) private viewportEvents: Angular2PluginViewportEvents
  ){
    addEventListener("message", this.postMessageListener.bind(this));
    this.iFrameMouseOver;
    this.windowEvents.minimized.subscribe((res) => {
      console.log('Minimized')
    })
    this.viewportEvents;
  }
  
  private postMessageListener(message: any): void {
    if(!message.data.request || !message.data.request.function || message.data.key === undefined
        || message.data.request.instanceId === undefined){
      return;
    }
    let fnString: string = message.data.request.function;
    let split: Array<string> = fnString.split('.');
    if(split[0] === 'registerAdapterInstance' && this.instanceId == -1){
      this.instanceId = message.data.request.instanceId;
      //console.log('registering iframe adapter instance with instance id: ', this.instanceId)
      return;
    }
    if(message.data.request.instanceId === this.instanceId && split[0] === 'windowActions'){
      this.resolvePromisesRecursively(this.translateFunction(message)).then(res => {
        message.source.postMessage({
          key: message.data.key,
          value: res,
          originCall: message.data.request.function,
          instanceId: message.data.request.instanceId
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

  private translateFunction(message: any){
    let args = message.data.request.args || [];
    let fnString: string = message.data.request.function;
    let split: Array<string> = fnString.split('.');
    let fn: Function;
    let fnRet: any;
    if(split.length > 0){
      switch(split[0]){
        case 'windowActions':
          split.shift();
          fn = (this.getAttrib(Object.assign({}, this.windowActions), split.join('.')) as Function);
          if(typeof fn === 'function'){
            fn = fn.bind(this.windowActions);
            if(args.length === 0){
              fnRet = fn();
            } else {
              fnRet = fn(...args);
            }
            return fnRet;
          } else {
            return undefined;
          }
        default:
          return undefined;
      }
    }
  }

  iFrameMouseOver(event: any){}
}