

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PluginFactory } from '../plugin-factory';
import { CompiledPlugin, CompiledPluginCustom } from '../../shared/compiled-plugin';
import { BaseLogger } from 'virtual-desktop-logger';
import { IFramePluginComponent } from '../iframe/iframe-plugin.component';

@Injectable()
export class IFramePluginFactory extends PluginFactory {
    private readonly logger: ZLUX.ComponentLogger = BaseLogger;
    private _pluginDefinition: MVDHosting.DesktopPluginDefinition;
    private _instanceId: MVDHosting.InstanceId;

    constructor() {
        super();
    }

    get pluginDefinition(): MVDHosting.DesktopPluginDefinition {
        return this._pluginDefinition;
    }

    get instanceId(): MVDHosting.InstanceId {
        return this._instanceId;
    }

    acceptableFrameworks(): string[] {
        return ['iframe'];
    }

    loadComponentFactories(pluginDefinition: MVDHosting.DesktopPluginDefinition): Promise<void> {
        this.logger.info(`ZWED5054I`, pluginDefinition.getIdentifier());
        /*this.logger.info(`IFrame component factories currently unsupported. `
                        +`Skipping for plugin ID=${pluginDefinition.getIdentifier()}`);*/

        return Promise.resolve();
    }

    loadPlugin(pluginDefinition: MVDHosting.DesktopPluginDefinition, instanceId: MVDHosting.InstanceId): Promise<CompiledPlugin | CompiledPluginCustom> {
        this._pluginDefinition = pluginDefinition;
        @NgModule({
            imports: [CommonModule],
            declarations: [IFramePluginComponent],
        })
        class RuntimePluginModule { }
        return Promise.resolve(new CompiledPluginCustom(IFramePluginComponent, RuntimePluginModule));
    }
}
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

