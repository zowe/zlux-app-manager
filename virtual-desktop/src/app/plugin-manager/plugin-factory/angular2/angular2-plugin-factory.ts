

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, CompilerFactory, /*CompilerOptions, COMPILER_OPTIONS, CompilerFactory*/ } from '@angular/core';
import { TRANSLATIONS, TRANSLATIONS_FORMAT, LOCALE_ID } from '@angular/core';

import { PluginFactory } from '../plugin-factory';
import { CompiledPlugin } from '../../shared/compiled-plugin';
import { Http } from '@angular/http';
import { Compiler, CompilerOptions, StaticProvider, ApplicationRef, Injector } from '@angular/core';
import { DomPortalOutlet, ComponentPortal } from '@angular/cdk/portal';
import { Observable } from 'rxjs/Rx';

import { ComponentFactory } from 'zlux-base/registry/registry';

import { LanguageLocaleService } from '../../../shared/language-locale.service';

interface MvdNativeAngularPlugin {
  pluginModule: any;
  pluginComponent: any;
}

interface MvdNativeAngularComponent {
  componentNgModule: any;
  componentNgComponent: any;
}

interface AngularComponentFactoryDefinition {
  componentScriptUrl: string;
  componentClass: ZLUX.ComponentClass;
  capabilities: ZLUX.Capability[];
}

interface MvdNativeAngularPluginComponentDefinition {
  getComponentFactoryDefinitions(pluginDefinition: MVDHosting.DesktopPluginDefinition): AngularComponentFactoryDefinition[];
}

class SimpleAngularComponentFactory extends ComponentFactory {
  constructor(
    private compiler: Compiler,
    private applicationRef: ApplicationRef,
    private injector: Injector,
    private componentModulePath: string,
    componentClass: ZLUX.ComponentClass,
    capabilities: ZLUX.Capability[]
  ) {
    super(componentClass, capabilities);
  }

  instantiateIntoDOM(target: HTMLElement): Observable<ZLUX.IComponent> {
    const promise: Promise<ZLUX.IComponent> = new Promise((resolve, reject) => {
      (window as any).require([this.componentModulePath],
        (fullPlugin: MvdNativeAngularComponent) => {
          console.log(fullPlugin);
          return this.compiler.compileModuleAsync(fullPlugin.componentNgModule).then(factory => {
            const resolver = factory.create(this.injector).componentFactoryResolver;
            const outlet = new DomPortalOutlet(target, resolver, this.applicationRef, this.injector);
            const portal = new ComponentPortal(fullPlugin.componentNgComponent, null); /* TODO */
            const componentRef = outlet.attachComponentPortal(portal);

            resolve(componentRef.instance as ZLUX.IComponent);
          }).catch((failure: any) => {
            console.log(failure);
            reject();
          });
        },
        (failure: any) => {
          reject();
        });
    });

    return Observable.fromPromise(promise);
  }
}

@Injectable()
export class Angular2PluginFactory extends PluginFactory {
  private static getAngularModuleURL(pluginDefinition: MVDHosting.DesktopPluginDefinition): string {
    return ZoweZLUX.uriBroker.pluginResourceUri(pluginDefinition.getBasePlugin(), 'main.js');
  }

  private static getAngularComponentsURL(pluginDefinition: MVDHosting.DesktopPluginDefinition): string {
    return ZoweZLUX.uriBroker.pluginResourceUri(pluginDefinition.getBasePlugin(), 'components.js');
  }

  private getTranslationFileURL(pluginDefinition: MVDHosting.DesktopPluginDefinition, language: string): string {
    return ZoweZLUX.uriBroker.pluginResourceUri(pluginDefinition.getBasePlugin(), `assets/i18n/messages.${language}.xlf`);
  }

  constructor(
    private http: Http,
    private compilerFactory: CompilerFactory,
    private compiler: Compiler,
    private applicationRef: ApplicationRef,
    private injector: Injector,
    private languageLocaleService: LanguageLocaleService
  ) {
    super();
  }

  acceptableFrameworks(): string[] {
    return ['angular2'];
  }

  loadComponentFactories(pluginDefinition: MVDHosting.DesktopPluginDefinition): Promise<void> {
    const scriptUrl = Angular2PluginFactory.getAngularComponentsURL(pluginDefinition);

    return new Promise((resolve, reject) => {
      (window as any).require([scriptUrl],
        (components: MvdNativeAngularPluginComponentDefinition) => {
          const factoryDefs = components.getComponentFactoryDefinitions(pluginDefinition);
          factoryDefs.forEach((factory: AngularComponentFactoryDefinition) => {
            const componentFactory = new SimpleAngularComponentFactory(this.compiler, this.applicationRef, this.injector, factory.componentScriptUrl, factory.componentClass, factory.capabilities);

            console.log(`Registering component factory for plugin ${pluginDefinition.getIdentifier()}:`);
            console.log(componentFactory);

            ZoweZLUX.registry.registerComponentFactory(componentFactory);

            resolve();
          });
        },
        (failure: any) => {
          console.log(`No component definition for plugin ${pluginDefinition.getIdentifier()}`);
          resolve();
        });
    });
  }

  loadPlugin(pluginDefinition: MVDHosting.DesktopPluginDefinition): Promise<CompiledPlugin> {
    this.loadComponentFactories(pluginDefinition);
    const scriptUrl = Angular2PluginFactory.getAngularModuleURL(pluginDefinition);

    console.trace("Angular2PluginFactory.loadPlugin scriptURL="+scriptUrl);

    return new Promise((resolve, reject) => {
      (window as any).require([scriptUrl],
        (plugin: MvdNativeAngularPlugin) =>
          this.getCompiler(pluginDefinition).then(compiler => {
            resolve(compiler.compileModuleAsync(plugin.pluginModule).then(factory =>
              new CompiledPlugin(plugin.pluginComponent, factory)
            ));
          }),
        (failure: any) =>
          reject(failure)
      );
    });
  }

  getTranslationProviders(pluginDefinition: MVDHosting.DesktopPluginDefinition): Promise<StaticProvider[]> {
    // Get the language id from the global
    // According to Mozilla.org this will work well enough for the
    // browsers we support (Chrome, Firefox, Edge, Safari)
    // https://developer.mozilla.org/en-US/docs/Web/API/NavigatorLanguage/language
    // TO DO: handle both language and local (e.g., both "en" and "en-US")
    // MVD-1671: support lang-LOCALE and ability to fall back to lang if lang-LOCALE is not found
    // MERGE QUESTION: should be put this in polyfills? abstract it somewhere? etc.?
    const language: string = this.languageLocaleService.getLanguage();
    const locale: string = this.languageLocaleService.getLocale();
    // return no providers if fail to get translation file for language
    const noProviders: StaticProvider[] = [];
    // No language or U.S. English: no translation providers
    if (!language || (language === 'en' && locale === 'US')) {
      return Promise.resolve(noProviders);
    }
    // ex.: messages.es-ES.xlf
    const translationFileURL = this.getTranslationFileURL(pluginDefinition, `${language}-${locale}`);
    // ex.: messages.es.xlf
    const fallbackTranslationFileURL = (locale != null) ? this.getTranslationFileURL(pluginDefinition, language) : null;
    return this.loadTranslations(translationFileURL)
      .catch(err => (fallbackTranslationFileURL != null) ? this.loadTranslations(fallbackTranslationFileURL) : Observable.throw(err))
      .toPromise()
      .then((translations: string) => [
        { provide: TRANSLATIONS, useValue: translations },
        { provide: TRANSLATIONS_FORMAT, useValue: 'xlf' },
        { provide: LOCALE_ID, useValue: language }
      ])
      .catch(() => noProviders);
  }

  getCompiler(pluginDefinition: MVDHosting.DesktopPluginDefinition): Promise<Compiler> {
    return this.getTranslationProviders(pluginDefinition).then(providers => {
      const options: CompilerOptions = {
        providers: providers
      };
      return <Compiler>this.compilerFactory.createCompiler([options]);
    });
  }


  loadTranslations(fileURL: string): Observable<string> {
    return this.http.get(fileURL).map(res => res.text());
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

