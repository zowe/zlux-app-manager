
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component ,Inject} from '@angular/core';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

 

export class AppComponent { 
  appName:string;
  appVersion:string;
  appType:string;
  copyright:string;
  installedApps:string[];
  iconImage:string;
  isPropertyWindow : boolean;
  isViewerWindow : boolean;

  constructor(
    @Inject(Angular2InjectionTokens.LAUNCH_METADATA) private launchMetadata: any
  ) {
    this.isPropertyWindow = false;
    this.isViewerWindow = true;
          
    if (this.launchMetadata != null && this.launchMetadata.isPropertyWindow) {
      this.appName = this.launchMetadata.appName;
      this.appVersion = this.launchMetadata.appVersion;
      this.appType = this.launchMetadata.appType;
      this.iconImage = this.launchMetadata.image;
      this.isPropertyWindow = true;
      this.isViewerWindow = false;
      this.copyright=this.launchMetadata.copyright;
    } else if (this.launchMetadata != null && this.launchMetadata.isViewerWindow){
      this.isViewerWindow=true;
    }
    
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
