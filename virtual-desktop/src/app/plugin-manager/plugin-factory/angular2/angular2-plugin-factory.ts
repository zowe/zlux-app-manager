

// /*
//   This program and the accompanying materials are
//   made available under the terms of the Eclipse Public License v2.0 which accompanies
//   this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

//   SPDX-License-Identifier: EPL-2.0

//   Copyright Contributors to the Zowe Project.
// */

console.log("Angular plugin factory!\n\n\n")

import { Injectable } from '@angular/core';
// import { ApplicationRef, Injectable, Injector, createNgModule } from '@angular/core';

// import { PluginFactory } from '../plugin-factory';
import { CompiledPlugin } from '../../shared/compiled-plugin';
// import { Compiler, CompilerOptions, ApplicationRef, Injector } from '@angular/core';
// import { DomPortalOutlet, ComponentPortal } from '@angular/cdk/portal';
// import { from, Observable } from 'rxjs';

// import { ComponentFactory } from 'zlux-base/registry/registry';
// import { TranslationLoaderService } from '../../../i18n/translation-loader.service';
import { BaseLogger } from 'virtual-desktop-logger';
import { HttpClient } from '@angular/common/http';

// interface MvdNativeAngularPlugin {
//   pluginModule: any;
//   pluginComponent: any;
// }

// interface MvdNativeAngularComponent {
//   componentNgModule: any;
//   componentNgComponent: any;
// }

// interface AngularComponentFactoryDefinition {
//   componentScriptUrl: string;
//   componentClass: ZLUX.ComponentClass;
//   capabilities: ZLUX.Capability[];
// }

// interface MvdNativeAngularPluginComponentDefinition {
//   getComponentFactoryDefinitions(pluginDefinition: MVDHosting.DesktopPluginDefinition): AngularComponentFactoryDefinition[];
// }

// class SimpleAngularComponentFactory {
//   private readonly logger: ZLUX.ComponentLogger = BaseLogger;

//   constructor(
//     private moduleLoader: NgModuleFactoryLoader,
//     private applicationRef: ApplicationRef,
//     private injector: Injector,
//     private componentModulePath: string,
//     componentClass: ZLUX.ComponentClass,
//     capabilities: ZLUX.Capability[]
//   ) {
//     super(componentClass, capabilities);
//   }

//   instantiateIntoDOM(target: any): Observable<any> {
//     const promise: Promise<any> = new Promise((resolve, reject) => {
//       (window as any).require([this.componentModulePath],
//         (fullPlugin: MvdNativeAngularComponent) => {
//           this.logger.debug("ZWED5314I", fullPlugin);
//           this.moduleLoader.load(fullPlugin.componentNgModule).then((ngModuleFactory: NgModuleFactory<any>) => {
//             const moduleRef = ngModuleFactory.create(this.injector);
//             const resolver = moduleRef.componentFactoryResolver;
//             const outlet = new DomPortalOutlet(target, resolver, this.applicationRef, this.injector);
//             const portal = new ComponentPortal(fullPlugin.componentNgComponent, null, moduleRef.injector);
//             const componentRef = outlet.attachComponentPortal(portal);

//             resolve(componentRef.instance as any);
//           }).catch((failure: any) => {
//             this.logger.warn("ZWED5315I", failure);
//             reject();
//           });
//         },
//         (failure: any) => {
//           reject();
//         });
//     });

//     return from(promise);
//   }
// }
// SimpleAngularComponentFactory;

@Injectable()
export class Angular2PluginFactory {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private static getAngularModuleURL(pluginDefinition: MVDHosting.DesktopPluginDefinition): string {
    return ZoweZLUX.uriBroker.pluginResourceUri(pluginDefinition.getBasePlugin(), 'main.js');
  }

  // private static getAngularComponentsURL(pluginDefinition: MVDHosting.DesktopPluginDefinition): string {
  //   return ZoweZLUX.uriBroker.pluginResourceUri(pluginDefinition.getBasePlugin(), 'components.js');
  // }

  constructor(
    // private compilerFactory: CompilerFactory,
    // private compiler: Compiler,
    // private applicationRef: ApplicationRef,
    // private injector: Injector,
    private http: HttpClient
    // private translationLoaderService: TranslationLoaderService
  ) {
    // super();
  }

  acceptableFrameworks(): string[] {
    return ['angular2', 'angular'];
  }

  loadComponentFactories(pluginDefinition: MVDHosting.DesktopPluginDefinition): Promise<void> {
    // const scriptUrl = Angular2PluginFactory.getAngularComponentsURL(pluginDefinition);

    // return new Promise((resolve, reject) => {
    //   if (pluginDefinition.hasComponents()) {
    //     (window as any).require([scriptUrl],
    //       (components: MvdNativeAngularPluginComponentDefinition) => {
    //         const factoryDefs = components.getComponentFactoryDefinitions(pluginDefinition);
    //         factoryDefs.forEach((factory: AngularComponentFactoryDefinition) => {
    //           const componentFactory = new SimpleAngularComponentFactory(this.compiler, this.applicationRef, this.injector,
    //             factory.componentScriptUrl, factory.componentClass, factory.capabilities);

    //           this.logger.info(`ZWED5051I`, pluginDefinition.getIdentifier()); //this.logger.info(`Registering component factory for plugin=${pluginDefinition.getIdentifier()}:`);
    //           this.logger.debug("ZWED5306I", componentFactory); //this.logger.debug(componentFactory);

    //           ZoweZLUX.registry.registerComponentFactory(componentFactory);

    //           resolve();
    //         });
    //       },
    //       (failure: any) => {
    //         this.logger.warn("ZWED5164W", pluginDefinition.getIdentifier()); //this.logger.warn(`No component definition for plugin ${pluginDefinition.getIdentifier()}`);
    //         resolve();
    //       });
    //   } else {
    //     resolve();
    //   }
    // });
    return new Promise((resolve, reject) => {
      resolve();
    });
  }

  loadPlugin(pluginDefinition: MVDHosting.DesktopPluginDefinition, instanceId: MVDHosting.InstanceId): Promise<CompiledPlugin | any> {
    // this.loadComponentFactories(pluginDefinition);
    const scriptUrl = Angular2PluginFactory.getAngularModuleURL(pluginDefinition);
    console.log("Do we have a URL? ", scriptUrl);
    this.logger.info(`ZWED5052I`, pluginDefinition.getIdentifier(), scriptUrl); //this.logger.info(`Loading Angular Plugin ID=${pluginDefinition.getIdentifier()}, URL=${scriptUrl}`);

    return new Promise((resolve, reject) => {
      this.http.get(scriptUrl, { responseType: 'text' }).subscribe(
        (response: any) => {
            console.log("Fetched plugin script content:", response);
            // Process the fetched script content as needed
            // Example: evaluate the script or create a module reference
            // const plugin = JSON.parse(response); // Convert the response to a JSON object
            const plugin = this.evaluateScript(response);
            console.log("Parsed plugin object:", plugin);
            // const moduleRef = createNgModule(plugin.pluginModule, this.injector);
            resolve(plugin);
        },
        (error: any) => {
            console.error("Failed to fetch plugin script:", error);
            try {
                const plugin = JSON.parse(error.text); // Convert error.text to a JSON object
                console.log("Parsed plugin object from error.text:", plugin);
                // const moduleRef = createNgModule(plugin.pluginModule, this.injector);
                resolve(plugin);
            } catch (parseError) {
                console.error("Failed to parse error.text as JSON:", parseError);
                reject(parseError);
            }
        }
    );
    
      // const moduleRef = createNgModule(plugin.pluginModule, this.injector);
      // resolve(true);
      // (window as any).require([scriptUrl],
      //   (plugin: MvdNativeAngularPlugin) =>
      //     const moduleRef = createNgModule(plugin.pluginModule, this.injector)
      //     this.getCompiler(pluginDefinition).then(compiler => {
      //       resolve(compiler.compileModuleAsync(plugin.pluginModule).then(factory =>
      //         new CompiledPlugin(plugin.pluginComponent, factory)
      //       ));
      //     }),
      //   (failure: any) =>
      //     reject(failure)
      // );
    });
  }

  evaluateScript(scriptContent: string): any {
    // Create a new function with the script content and execute it
    const scriptFunction = new Function('exports', scriptContent);
    const exports = {};
    scriptFunction(exports);

    // Return the exported object
    return exports;
}

  // getCompiler(pluginDefinition: MVDHosting.DesktopPluginDefinition): Promise<Compiler> {
  //   return this.translationLoaderService.getTranslationProviders(pluginDefinition.getBasePlugin()).then(providers => {
  //     const options: CompilerOptions = {
  //       providers: providers
  //     };
  //     return <Compiler>this.compilerFactory.createCompiler([options]);
  //   });
  // }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

