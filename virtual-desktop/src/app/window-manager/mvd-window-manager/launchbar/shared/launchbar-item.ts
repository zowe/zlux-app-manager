

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { DesktopPluginDefinitionImpl } from 'app/plugin-manager/shared/desktop-plugin-definition';
//import { Observable } from '../../../../../../node_modules/rxjs';

export abstract class LaunchbarItem {
  abstract readonly label: string;
  abstract readonly image: string | null;
  abstract readonly plugin: DesktopPluginDefinitionImpl;
  abstract readonly launchMetadata: any;
  abstract readonly instanceCount: number;
  abstract readonly windowPreviews: Array<HTMLImageElement>;
  abstract readonly windowPreviewsIds: Array<number>;
  showInstanceView: boolean;
  showIconLabel: boolean;
  /*
  observableClick: Observable<any>;
  abstract clicked(): void;

  getClickedObservable(): Observable<any> {
    return this.observableClick;
  }
  */
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

