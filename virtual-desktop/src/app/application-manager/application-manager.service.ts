/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Injector, NgModuleFactory, Compiler, ComponentRef, Type, SimpleChanges, SimpleChange, OnChanges } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { PluginLoader } from 'app/plugin-manager/shared/plugin-loader';
import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';
import { PluginManager } from "app/plugin-manager/shared/plugin-manager";

import { LoadFailureComponent } from './load-failure/load-failure.component';
import { InjectionManager } from './injection-manager/injection-manager.service';
import { ApplicationInstance } from './application-instance';
import { FailureModule } from './load-failure/failure.module';
// import { ViewportId } from './viewport-manager/viewport';
import { ViewportManager } from './viewport-manager/viewport-manager.service';
import { EmbeddedInstance } from 'pluginlib/inject-resources';
import { BaseLogger } from 'virtual-desktop-logger';

@Injectable()
export class ApplicationManager implements MVDHosting.ApplicationManagerInterface {
  private failureModuleFactory: NgModuleFactory<FailureModule>;
  private applicationInstances: Map<MVDHosting.InstanceId, ApplicationInstance>;
  private nextInstanceId: MVDHosting.InstanceId;
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;

  constructor(
    private injector: Injector,
    private pluginLoader: PluginLoader,
    private viewportManager: ViewportManager,   // convention in angular is that injectable singleton provider from module will by keyed by type and placed in slot.
    private pluginManager: PluginManager,
    private injectionManager: InjectionManager,
    private compiler: Compiler
  ) {
    this.failureModuleFactory = this.compiler.compileModuleSync(FailureModule);
    this.applicationInstances = new Map();
    this.nextInstanceId = 0;

    (window as any).ZoweZLUX.dispatcher.setLaunchHandler((zluxPlugin:ZLUX.Plugin, metadata: any) => {
      return this.pluginManager.findPluginDefinition(zluxPlugin.getIdentifier()).then(plugin => {
        if (plugin == null) {
          throw new Error('Unknown plugin in launch handler '+zluxPlugin);
        }
        return this.spawnApplication(plugin as DesktopPluginDefinitionImpl, metadata);
      });
    });
    (window as any).ZoweZLUX.dispatcher.setPostMessageHandler( (instanceId:MVDHosting.InstanceId, message:any ) => {
       let applicationInstance:ApplicationInstance|undefined = this.applicationInstances.get(instanceId);
       if (applicationInstance){
         this.logger.debug(`PostMessage for instance=${applicationInstance}, iframeID=${applicationInstance.iframeId}`);
         let theIframe:HTMLElement|null = document.getElementById(applicationInstance.iframeId);
         if (theIframe){
           this.logger.debug(`PostMessage iframe found=`,theIframe);
           let iframeWindow:Window|null = (theIframe as HTMLIFrameElement).contentWindow!;
           iframeWindow.postMessage({ zluxRemoteFunction: "echo", message: "Say Cheese"}, "*");
         }
         
       }
    });
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

  private spawnApplicationIntoViewport(plugin: DesktopPluginDefinitionImpl, launchMetadata: any,
    applicationInstance: ApplicationInstance, viewportId: MVDHosting.ViewportId): Promise<MVDHosting.InstanceId> {
    // TODO: race condition?
    return this.pluginLoader.loadPlugin(plugin, viewportId)
      .then((compiled): MVDHosting.InstanceId => {
        //  When angular module is compiled, it produces and ngModuleFactory
        //  The ngModuleFactory, when given an injector produces a module ref
        //  The moduleRef, when given type of component and component-level injector produces component-ref
        //  ComponentRef contains instantiated instance of Component
        const injector = this.injectionManager.generateModuleInjector(plugin, launchMetadata);
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
        } else {
          this.logger.info(`App callbacks not registered. Couldn't find instance object or object didn't provide callbacks.`
                          +`App ID=${plugin.getIdentifier()}, Instance Obj=`,notATurtle); 
        }


        return applicationInstance.instanceId;
      })
      .catch((errors) => {
        const injector = this.injectionManager.generateFailurePluginInjector(errors);
        this.instantiateApplicationInstance(applicationInstance, this.failureModuleFactory, injector);
        applicationInstance.setMainComponent(LoadFailureComponent);
        this.generateMainComponentRefFor(applicationInstance, viewportId);

        return Promise.reject(errors);
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

