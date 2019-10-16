/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Inject, Component } from '@angular/core';
import { Angular2InjectionTokens, Angular2PluginWindowActions, Angular2PluginWindowEvents, Angular2PluginViewportEvents } from '../../../../pluginlib/inject-resources';
import { SafeResourceUrl } from '@angular/platform-browser';

@Component({
    templateUrl: './iframe-plugin.component.html'
})


export class IFramePluginComponent {

  private windowActions:  Angular2PluginWindowActions;
  private windowEvents: Angular2PluginWindowEvents;
  private viewportEvents: Angular2PluginViewportEvents;
  startingPage: SafeResourceUrl;
  iframeId: string;

  constructor(
    @Inject(Angular2InjectionTokens.WINDOW_ACTIONS) windowActions: Angular2PluginWindowActions,
    @Inject(Angular2InjectionTokens.WINDOW_EVENTS) windowEvents: Angular2PluginWindowEvents,
    @Inject(Angular2InjectionTokens.VIEWPORT_EVENTS) viewportEvents: Angular2PluginViewportEvents,
  ){
    addEventListener('message', this.postMessageListener.bind(this));
    //the following 5 lines are to temporarily suppress typescript warnings
    //i miss good ol gcc that lets you compile literally anything :(
    this.viewportEvents;
    this.windowEvents;
    this.startingPage;
    this.iframeId;
    this.iFrameMouseOver;
    this.windowActions = windowActions;
    this.windowEvents = windowEvents;
    this.viewportEvents = viewportEvents;
  }

  postMessageListener(message: any): void {
    if(!message.data.request || !message.data.request.function || message.data.key === undefined){
      return;
    }
    //console.log('postMessageListener() - received translation request for: ', message.data.request.function, '\n Message: ', message)
    this.resolvePromisesRecursively(this.translateFunction(message)).then(res => {
      message.source.postMessage({
        key: message.data.key,
        value: res,
        originCall: message.data.request.function
      }, '*');
    });
    return;
  }

  iFrameMouseOver(event: any){}

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
    //console.log('(backend) translateFunction() - translating: ', fnString);
    if(split.length > 0){
      switch(split[0]){
        case 'ZoweZLUX':
            split.shift();
            fn = (this.getAttrib(Object.assign({}, ZoweZLUX), split.join('.')) as Function);
            if(typeof fn === 'function'){
              fn = fn.bind((window as any).ZoweZLUX[split[0]]);
              if(args.length === 0){
                fnRet = fn();
              } else {
                for(let i = 0; i < args.length; i++){
                  if(args[i] == 'this'){
                    if((window as any).iframeAdapter.thisInstances[message.data.key]){
                      args[i] = (window as any).iframeAdapter.thisInstances[message.data.key];
                    } else {
                      console.log('Could not find \'this\' for requesting application, setting to iFrame adapter.')
                      args[i] = source;
                    }
                  }
                }
                fnRet = fn(...args);
              }
              return fnRet;
            } else {
              return undefined;
            }
        case 'windowActions':
          split.shift();
          fn = (this.getAttrib(Object.assign({}, this.windowActions), split.join('.')) as Function);
          if(typeof fn === 'function'){
            fn = fn.bind(this.windowActions);
            if(args.length === 0){
              fnRet = fn();
            } else {
              for(let i = 0; i < args.length; i++){
                if(args[i] == 'this'){
                  if((window as any).iframeAdapter.thisInstances[message.data.key]){
                    args[i] = (window as any).iframeAdapter.thisInstances[message.data.key];
                  } else {
                    console.log('Could not find \'this\' for requesting application, setting to iFrame adapter.')
                    args[i] = source;
                  }
                } else if(args[i] === 'contextMenuItems'){
                  if((window as any).iframeAdapter.contextMenuObjects[message.data.key]){
                    args[i] = (window as any).iframeAdapter.contextMenuObjects[message.data.key];
                  } else {
                    console.log('Could not find \'this\' for requesting application, setting to undefined.')
                    args[i] = undefined;
                  }
                }
              }
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
}