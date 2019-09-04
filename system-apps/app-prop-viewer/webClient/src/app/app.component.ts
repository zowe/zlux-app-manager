
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
  appId: string;
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
          
    if (this.launchMetadata != null && this.launchMetadata.data && this.launchMetadata.data.isPropertyWindow) {
      this.setInfoFromMessage(this.launchMetadata.data);
    } else if (this.launchMetadata != null && this.launchMetadata.data && this.launchMetadata.data.isViewerWindow){
      this.isViewerWindow=true;
    }
    
  }

  private setInfoFromMessage(message: any) {
    this.appName = message.appName;
    this.appVersion = message.appVersion;
    this.appId = message.appId;
    this.appType = message.appType;
    this.iconImage = message.image;
    this.isPropertyWindow = true;
    this.isViewerWindow = false;
    this.copyright=message.copyright;
  }

  zluxOnMessage(eventContext: any): Promise<any> {
    return new Promise((resolve,reject)=> {
      if (eventContext != null && eventContext.data && eventContext.data.isPropertyWindow) {
        resolve(this.setInfoFromMessage(eventContext.data));
      } else {
        reject('Event context missing or malformed');
      }
    });    
  }


  provideZLUXDispatcherCallbacks(): ZLUX.ApplicationCallbacks {
    return {
      onMessage: (eventContext: any): Promise<any> => {
        return this.zluxOnMessage(eventContext);
      }      
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
