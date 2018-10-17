

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';

import {
  Component,
  Inject
  } from '@angular/core';
 
  
@Component({
  selector: 'rs-app-properties',
  templateUrl: 'app-properties.component.html',
  styleUrls: [ 'app-properties.component.css' ],
 })
export class AppPropertiesComponent {
   
 
  constructor(
    @Inject(PLUGIN_DEF) public pluginDef: DesktopPluginDefinitionImpl,
    @Inject(APP_PROPERTIES) public appinfo: any[]
  ) {
     console.log("s");

  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

