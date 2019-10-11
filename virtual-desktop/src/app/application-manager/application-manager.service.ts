/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector, NgModuleFactory, Compiler, ComponentRef, Type, SimpleChanges, SimpleChange, OnChanges } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { HttpClient } from '@angular/common/http';

import { PluginLoader } from 'app/plugin-manager/shared/plugin-loader';
import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { PluginManager } from 'app/plugin-manager/shared/plugin-manager';

import { LoadFailureComponent } from './load-failure/load-failure.component';
import { InjectionManager } from './injection-manager/injection-manager.service';
import { ApplicationInstance } from './application-instance';
import { FailureModule } from './load-failure/failure.module';
// import { ViewportId } from './viewport-manager/viewport';
import { ViewportManager } from './viewport-manager/viewport-manager.service';
import { EmbeddedInstance } from 'pluginlib/inject-resources';
import { BaseLogger } from 'virtual-desktop-logger';
import { IFRAME_NAME_PREFIX, INNER_IFRAME_NAME } from '../shared/named-elements';
import { L10nConfigService } from '../i18n/l10n-config.service';

@Injectable()
export class ApplicationManager implements MVDHosting.ApplicationManagerInterface {
  private failureModuleFactory: NgModuleFactory<FailureModule>;
  private applicationInstances: Map<MVDHosting.InstanceId, ApplicationInstance>;
  private nextInstanceId: MVDHosting.InstanceId;
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private knownLoggerMessageChecks: string[];

  constructor(
    private injector: Injector,
    private pluginLoader: PluginLoader,
    private viewportManager: ViewportManager,   // convention in angular is that injectable singleton provider from module will by keyed by type and placed in slot.
    private pluginManager: PluginManager,
    private injectionManager: InjectionManager,
    private compiler: Compiler,
    private l10nConfigService: L10nConfigService,
    private http: HttpClient,
  ) {
    this.failureModuleFactory = this.compiler.compileModuleSync(FailureModule);
    this.applicationInstances = new Map();
    this.knownLoggerMessageChecks = [];
    this.nextInstanceId = 0;
    (window as any).ZoweZLUX.dispatcher.setLaunchHandler((zluxPlugin:ZLUX.Plugin, metadata: any) => {
      return this.pluginManager.findPluginDefinition(zluxPlugin.getIdentifier()).then(plugin => {
        if (plugin == null) {
          throw new Error('Unknown plugin in launch handler '+zluxPlugin);
        }
        return this.spawnApplication(plugin as DesktopPluginDefinitionImpl, metadata);
      });
    });
    window.addEventListener('message',(message:any)=> {
      if (message.data === 'iframeload') {
        this.applicationInstances.forEach((appInstance)=> {
          let instance = appInstance.instanceId;
          const iframe:HTMLElement|null = document.getElementById(`${IFRAME_NAME_PREFIX}${instance}`);
          console.log(`iframe=`,iframe);
          if (iframe) {
            if ((iframe as any).contentWindow == message.source
                || (iframe as any).contentWindow == message.source.parent
                || ((iframe as any).src.indexOf(message.origin) == 0)) {
              //it's this one
              const appInstance = this.applicationInstances.get(instance);
              if (appInstance) {
                const pluginId = appInstance.plugin.getIdentifier();
                this.logger.info(`Iframe loaded: ${pluginId}, instance=${instance}`);
                return ZoweZLUX.dispatcher.iframeLoaded(instance, pluginId);
              }
              return undefined;
            }
            return undefined;
          }
          return undefined;
        });
        this.logger.warn(`No iframe identified as source of message`);
        return true;
      } else {
        let res;
        if(!message.data || message.data.key === undefined){
          return;
        }
        if(!message.data.request.function){
          return;
        }
        res = this.resolvePromisesRecursively(this.translateFunction(message));
        message.source.postMessage({
          key: message.data.key,
          value: res,
          originCall: message.data.request.function
        }, '*');
        return;
      }
    });
    (window as any).ZoweZLUX.dispatcher.setPostMessageHandler( (instanceId:MVDHosting.InstanceId, message:any ) => {
       let applicationInstance:ApplicationInstance|undefined = this.applicationInstances.get(instanceId);
       if (applicationInstance){
         let theIframe:HTMLElement|null = document.getElementById(`${IFRAME_NAME_PREFIX}${instanceId}`);
         if (theIframe){
           /* checking if iframe-in-iframe, which we can see in a remote host scenario.
              Sending the message to the wrong iframe will result in the message being dropped.
              The inner iframe is not under control of the zlux framework, so the name here is by convention.
              If people use the wrong name, they get nothing.
           */
           let secondIframe = (theIframe as HTMLIFrameElement).contentWindow.document.getElementById(INNER_IFRAME_NAME);
           if (secondIframe) {
             theIframe = secondIframe;
           }
           this.logger.debug(`PostMessage for instance=`,applicationInstance);
           let iframeWindow:Window|null = (theIframe as HTMLIFrameElement).contentWindow!;
           iframeWindow.postMessage(message, "*");
         } else {
           this.logger.warn(`iframe postMessage failed, no iframe found for ${applicationInstance.plugin.getIdentifier()}, id=${instanceId}`);
         }
       }
    });
  }

  private resolvePromisesRecursively(p: any){
    if(p instanceof Promise){
      p.then(res => {
        this.resolvePromisesRecursively(res);
      })
    } else {
      return p;
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

  private generateInstanceId(): MVDHosting.InstanceId {
    return this.nextInstanceId ++;
  }

  private createApplicationInstance(plugin: MVDHosting.DesktopPluginDefinition): ApplicationInstance {
    const id = this.generateInstanceId();
    const applicationInstance = new ApplicationInstance(id, plugin);
    this.applicationInstances.set(id, applicationInstance);

    return applicationInstance;
  }

  private instantiateApplicationInstance(instance: ApplicationInstance, moduleFactory: NgModuleFactory<any>, injector: Injector): void {
    const moduleRef = moduleFactory.create(injector);
    instance.setModuleRef(moduleRef);
  }

  // This is the component instantiator and injector

  private generateComponentRefFor(instance: ApplicationInstance, viewportId: MVDHosting.ViewportId, component: Type<any>): void {
    if (instance.moduleRef == null) {
      this.logger.warn('Component ref requested before module ref available');
      return;
    } else if (instance.viewportContents.get(viewportId) != null) {
      this.logger.warn('Overwriting existing component ref for window');
    }

    const viewport = this.viewportManager.getViewport(viewportId);

    if (viewport == null) {
      throw new Error('Unknown viewport when requesting component generation');
    }

    const factory = instance.moduleRef.componentFactoryResolver.resolveComponentFactory(component);
    const componentRef = factory.create(this.injectionManager.generateComponentInjector(viewport, instance.moduleRef.injector));
    //this.logger.info("AppMgr about to associate aInst with component "+componentRef);
    //this.logger.info(componentRef);
    instance.viewportContents.set(viewportId, componentRef);
    let instanceOfComponent:any = componentRef.instance;
    //this.logger.info("instance = "+instanceOfComponent);
    //this.logger.info(instanceOfComponent);
    if (instanceOfComponent.iframeId){
      instance.isIFrame = true;
      instance.iframeId = instanceOfComponent.iframeId;
      this.logger.debug("iframeID found = ",instance.iframeId);
    }
  }

  private generateMainComponentRefFor(instance: ApplicationInstance, viewportId: MVDHosting.ViewportId): void {
    if (instance.mainComponent == null) {
      throw new Error('Plugin does not have a main component to generate');
    }

    this.generateComponentRefFor(instance, viewportId, instance.mainComponent);
  }

  private generateInjectorAfterCheckingForLoggerMessages(compiled: any, plugin: DesktopPluginDefinitionImpl, launchMetadata: any,
    applicationInstance: ApplicationInstance, viewportId: MVDHosting.ViewportId, messages: any): number {
      //  When angular module is compiled, it produces and ngModuleFactory
      //  The ngModuleFactory, when given an injector produces a module ref
      //  The moduleRef, when given type of component and component-level injector produces component-ref
      //  ComponentRef contains instantiated instance of Component
      if (applicationInstance.mainComponent) {
        // applicationInstance should not have its main component initialized (gets set further down the method)
        // if applicationInstance does have a mainComponent, it means the application generation became out of sync
        // so we return as to not repeat the process and create two Viewports for one instance
        return applicationInstance.instanceId;
      }
      let injector;
      if (messages) {
        injector = this.injectionManager.generateModuleInjector(plugin, launchMetadata, messages);
      } else {
        injector = this.injectionManager.generateModuleInjector(plugin, launchMetadata);
      }
      this.instantiateApplicationInstance(applicationInstance, compiled.moduleFactory, injector);
      this.logger.debug(`appMgr spawning plugin ID=${plugin.getIdentifier()}, `
                        +`compiled.initialComponent=`,compiled.initialComponent);
      applicationInstance.setMainComponent(compiled.initialComponent); 
      this.generateMainComponentRefFor(applicationInstance, viewportId);   // new component is added to DOM here
      if (applicationInstance.isIFrame) {
        // applicationInstance.ifrramwWindow = 
      }
      //Beneath all the abstraction is the instance of the App object, framework-independent
      let notATurtle = this.getJavascriptObjectForApplication(applicationInstance, viewportId);
      // JOE HAX - register to dispatcher
      ZoweZLUX.dispatcher.registerPluginInstance(plugin.getBasePlugin(),                  // this is Plugin class instance
                                                  applicationInstance.instanceId,
                                                  applicationInstance.isIFrame );   // instanceId is proxy handle to isntance
      if (notATurtle && (typeof notATurtle.provideZLUXDispatcherCallbacks == 'function')) {
        ZoweZLUX.dispatcher.registerApplicationCallbacks(plugin.getBasePlugin(), applicationInstance.instanceId, notATurtle.provideZLUXDispatcherCallbacks());
      } else if (!applicationInstance.isIFrame) {
        this.logger.info(`App callbacks not registered. Couldn't find instance object or object didn't provide callbacks.`
                        +`App ID=${plugin.getIdentifier()}, Instance Obj=`,notATurtle); 
      }


      return applicationInstance.instanceId;
    }

  private spawnApplicationIntoViewport(plugin: DesktopPluginDefinitionImpl, launchMetadata: any,
    applicationInstance: ApplicationInstance, viewportId: MVDHosting.ViewportId): Promise<MVDHosting.InstanceId> {
    // TODO: Race condition problem, this Promise may become out of sync. A check is used to handle this inside this.generateInjectorAfterCheckingForLoggerMessages
    // but would be best to solve the root cause (if there is a better way)
    return new Promise((resolve, reject)=> {
      this.pluginLoader.loadPlugin(plugin, applicationInstance.instanceId)
      .then((compiled): void => {
        if (this.knownLoggerMessageChecks.indexOf(plugin.getIdentifier()) > -1) { // Check if logger has been instantiated (no need to re-generate messages)
          resolve(this.generateInjectorAfterCheckingForLoggerMessages(compiled, plugin, launchMetadata, applicationInstance, viewportId, null));
        } else {
          this.knownLoggerMessageChecks.push(plugin.getIdentifier());
          let languageCode = this.l10nConfigService.getDefaultLocale().languageCode; // Figure out the desktop language
          let messageLoc = ZoweZLUX.uriBroker.pluginResourceUri(plugin.getBasePlugin(), `assets/i18n/log/messages_${languageCode}.json`);
          this.http.get(messageLoc).subscribe( // Try to load log messages of desired language
          messages => {
              let messageLocEN = ZoweZLUX.uriBroker.pluginResourceUri(plugin.getBasePlugin(), `assets/i18n/log/messages_en.json`);
              this.http.get(messageLocEN).subscribe( // Try to load English log messages
                messagesEN => {
                  let mergedMessages = Object.assign(messagesEN, messages); // Merge the messages (so English is used as a fallback)
                  resolve(this.generateInjectorAfterCheckingForLoggerMessages(compiled, plugin, launchMetadata, applicationInstance, viewportId, mergedMessages));
                },
                error => { // If English is not found, just return the previously obtained messages.
                  resolve(this.generateInjectorAfterCheckingForLoggerMessages(compiled, plugin, launchMetadata, applicationInstance, viewportId, messages));
                });
          }, error => {
            if (error.status = 404) { // If log messages are not available in desired language,
              let messageLocEN = ZoweZLUX.uriBroker.pluginResourceUri(plugin.getBasePlugin(), `assets/i18n/log/messages_en.json`); // Default to English
              this.http.get(messageLocEN).subscribe( // ...try English.
                messages => {
                  resolve(this.generateInjectorAfterCheckingForLoggerMessages(compiled, plugin, launchMetadata, applicationInstance, viewportId, messages));
                }, error => { // In all other cases, load the logger without messages.
                  resolve(this.generateInjectorAfterCheckingForLoggerMessages(compiled, plugin, launchMetadata, applicationInstance, viewportId, null));
                });
            }
          });
        }
      })
      .catch((errors) => {
        const injector = this.injectionManager.generateFailurePluginInjector(errors);
        this.instantiateApplicationInstance(applicationInstance, this.failureModuleFactory, injector);
        applicationInstance.setMainComponent(LoadFailureComponent);
        this.generateMainComponentRefFor(applicationInstance, viewportId);

        reject(errors);
      });

    });

  }

  spawnApplicationWithParms(plugin:ZLUX.Plugin, viewParms:any, launchMetadata:any):Promise<MVDHosting.InstanceId>{
    let pluginDefinition:DesktopPluginDefinitionImpl = new DesktopPluginDefinitionImpl(plugin);
    if (viewParms.width){
      pluginDefinition.widthOverride = viewParms.width;
    }
    if (viewParms.height){
      pluginDefinition.heightOverride = viewParms.height;
    }
    return this.spawnApplication(pluginDefinition,launchMetadata);
  }

  spawnApplication(plugin: DesktopPluginDefinitionImpl, launchMetadata: any): Promise<MVDHosting.InstanceId> {
    // Create fresh application instance
    //console.trace("AppManager.service spawnApp called with plugin (type DPD) = "+JSON.stringify(plugin));
    const applicationInstance = this.createApplicationInstance(plugin);

    // Generate initial instance window
    const windowManager: MVDWindowManagement.WindowManagerServiceInterface = this.injector.get(MVDWindowManagement.Tokens.WindowManagerToken);
    const windowId = windowManager.createWindow(plugin);
    const viewportId = windowManager.getViewportId(windowId);
    this.viewportManager.registerViewport(viewportId, applicationInstance.instanceId);

    return this.spawnApplicationIntoViewport(plugin, launchMetadata, applicationInstance, viewportId);
  }

  spawnApplicationWithTargetAndParms(plugin: ZLUX.Plugin, viewParms:any, launchMetadata: any,
    viewportId: MVDHosting.ViewportId): Promise<MVDHosting.InstanceId> {
    let pluginDefinition:DesktopPluginDefinitionImpl = new DesktopPluginDefinitionImpl(plugin);
    if (viewParms.width){
      pluginDefinition.widthOverride = viewParms.width;
    }
    if (viewParms.height){
      pluginDefinition.heightOverride = viewParms.height;
    }
    return this.spawnApplicationWithTarget(pluginDefinition,launchMetadata,viewportId);
  }


  spawnApplicationWithTarget(plugin: DesktopPluginDefinitionImpl, launchMetadata: any,
    viewportId: MVDHosting.ViewportId): Promise<MVDHosting.InstanceId> {
    // Create fresh application instance
    const applicationInstance = this.createApplicationInstance(plugin);

    // Generate initial instance window
    this.viewportManager.registerViewport(viewportId, applicationInstance.instanceId);

    return this.spawnApplicationIntoViewport(plugin, launchMetadata, applicationInstance, viewportId);
  }

  showApplicationWindow(plugin: DesktopPluginDefinitionImpl): Promise<MVDHosting.InstanceId> {
    const windowManager: MVDWindowManagement.WindowManagerServiceInterface = this.injector.get(MVDWindowManagement.Tokens.WindowManagerToken);
    const windowId = windowManager.getWindow(plugin);
    if (windowId != null) {
      windowManager.showWindow(windowId);
      return new Promise((resolve,reject)=> {
        resolve(windowId); //possibly a bug: windowid and instanceid could be different?
      });
    } else {
      return this.spawnApplication(plugin, null);
    }
  }

  showApplicationInstanceWindow(plugin: DesktopPluginDefinitionImpl, viewportId: MVDHosting.ViewportId): void {
    this.logger.warn('Not yet implemented: showapplicationinstancewindow');
  }

  isApplicationRunning(plugin: DesktopPluginDefinitionImpl): boolean {
    const windowManager: MVDWindowManagement.WindowManagerServiceInterface = this.injector.get(MVDWindowManagement.Tokens.WindowManagerToken);
    return windowManager.getWindow(plugin) != null;
  }

  getViewportComponentRef(viewportId: MVDHosting.ViewportId): ComponentRef<any> | null {
    const instanceId = this.viewportManager.getApplicationInstanceId(viewportId);
    if (instanceId == null) {
      return null;
    }

    const applicationInstance = this.applicationInstances.get(instanceId);
    if (applicationInstance != null) {
      return applicationInstance.getComponentRefFor(viewportId);
    } else {
      return null;
    }
  }

  private getJavascriptObjectForApplication(appInstance:ApplicationInstance, viewportId: MVDHosting.ViewportId): any {
    const componentRef = appInstance.viewportContents.get(viewportId);
    if (componentRef) {
      return componentRef.instance;
    } else {
      return null;
    }
  }
  
  setEmbeddedInstanceInput(embeddedInstance: EmbeddedInstance, input: string, value: any): void {
    this.logger.debug(`setEmbeddedInstanceInput '${input}' to value '${value}'`);
    let appInstance = this.applicationInstances.get(embeddedInstance.instanceId);
    if (appInstance == undefined) {
      return;
    }
    const componentRef = appInstance.viewportContents.get(embeddedInstance.viewportId);
    if (componentRef === undefined) {
      return;
    }
    if (!appInstance.isMainComponentInput(input)) {
      return;
    }
    const instance = componentRef.instance;
    const previousValue = instance[input];
    if (previousValue === value) {
      return;
    }
    instance[input] = value;
    const onChanges = instance as OnChanges;
    if (typeof onChanges.ngOnChanges === 'function') {
      const change: SimpleChange = new SimpleChange(instance[input], value, false);
      const changes: SimpleChanges = {};
      changes[input] = change;
      onChanges.ngOnChanges(changes);
    }
  }
  
  getEmbeddedInstanceOutput(embeddedInstance: EmbeddedInstance, output: string): Observable<any> | undefined {
    this.logger.debug(`getEmbeddedInstanceOutput '${output}'`);
    let appInstance = this.applicationInstances.get(embeddedInstance.instanceId);
    if (appInstance !== undefined) {
      const componentRef = appInstance.viewportContents.get(embeddedInstance.viewportId);
      if (componentRef !== undefined) {
        const instance = componentRef.instance;
        if (appInstance.isMainComponentOutput(output)) {
          return instance[output];
        }
      }
    }
    return undefined;
  }

  killApplication(plugin:ZLUX.Plugin, appId:MVDHosting.InstanceId):void {
    ZoweZLUX.dispatcher.deregisterPluginInstance(plugin,
                                                appId);   // instanceId is proxy handle to isntance 

  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

