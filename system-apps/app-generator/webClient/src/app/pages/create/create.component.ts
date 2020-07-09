
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, ViewChild, TemplateRef, EventEmitter, AfterViewInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { ZoweApplication } from "../../shared/models/application";
import { NumberModule } from "carbon-components-angular";

const STARTING_CONFIG = {
  "identifier": "",
  "apiVersion": "1.0.0",
  "pluginVersion": "1.0.0",
  "pluginType": "application",
  "license":"",
  "author":"",
  "homepage":"",
  "webContent": {
    "framework": "",
    "launchDefinition": {
      "pluginShortNameKey": "PluginName",
      "pluginShortNameDefault": "",
      "imageSrc": "assets/icon.png",
      "startingPage": "",
    },
    "descriptionKey": "PluginDescription",
    "descriptionDefault": "",
    "defaultWindowStyle": {
      "width": 800,
      "height": 600
    }
  }
};

@Component({
  selector: "app-create",
  templateUrl: "./create.component.html",
  styleUrls: ["./create.component.scss"]
})

export class CreateComponent implements OnInit, AfterViewInit {
  pluginConfig: ZoweApplication;
  currentFramework: string;
  currentTemplate: string;
  callback: any;
  frameworks: any; 
  templates: any;
  templateLists: any;
  licenses: any;
  isIframe: boolean;
  selectedTemplateDescription: string;

  constructor(private http: HttpClient) {
    this.pluginConfig = Object.assign({},STARTING_CONFIG);
    this.isIframe = false;
    this.frameworks = [
      { value:"angular", 
        desc: "Apps using Angular exist within the same webpage as the framework and use the same libraries, resulting in deduplication. These apps can access context objects via Angular Injectables, and are built with webpack.",
      },
      { value:"react", 
        desc: "Apps using React exist within the same webpage as the framework, but unlike Angular do not share React libraries with the framework. These apps can access context objects via the props constructor parameter, and are built with webpack.",
      },
      { value:"iframe", 
        desc: "These apps do not exist within the same webpage as the framework. They are sandboxed and can be built using any technology with any libraries, but can access context objects via the Zowe framework's iframe adapter.",
      }
    ];

    this.templateLists = {
      "angular": [
        {
          content:"Basic",
          desc:"A basic Angular template",
        },
      ],
      "react": [
        {
          content:"Basic",
          desc:"A basic React template",
        },
      ],
      "iframe": [
        {
          content:"Basic",
          desc:"A basic iframe template",
        },
      ],
    };

    this.licenses = [
        {
          content: "Apache-2.0",
        },
        {
          content: "EPL-2.0",
        },
      ];

/*    this.licenses = [
      {
        content: Apache-2.0,
      },
      {
        content: EPL-2.0,
      },
      {
        content: GPL-2.0-or-later,
      },
      {
        content: GPL-3.0-or-later,
      },
      {
        content: MIT,
      },
    ];*/
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
  }

  onFrameworkSelect(event: any): void {
    this.pluginConfig.webContent.framework = event;
    if(event == 'iframe')
      this.isIframe = !(this.isIframe);
    else this.isIframe = false;
    this.templates = this.templateLists[event];
  }

  onTemplateSelect(event: any) {
    this.pluginConfig.template = event.item.content;
    this.selectedTemplateDescription = event.item.desc;
  }

  onLicenseSelect(event: any) {
    this.pluginConfig.license = event.item.content;
  }

  get pluginText() {
    return JSON.stringify(this.pluginConfig,null,2);
  }

  generateApp() {
    let projectInfo: any = Object.assign({template:this.currentTemplate}, STARTING_CONFIG, this.pluginConfig);
    if (projectInfo.webContent.framework == 'iframe') {
      projectInfo.webContent.standaloneUseFramework = true;
      projectInfo.webContent.startingPage = "html/index.html";
    }
    const MY_PLUGIN = ZoweZLUX.iframe.pluginDef.basePlugin;
    ZoweZLUX.uriBroker.pluginRESTUri(MY_PLUGIN,'gen','project/create').then(uri => {
      this.http.post(uri, projectInfo)
        .subscribe((res:any) => {
          let appList;

          if (window.localStorage.getItem(MY_PLUGIN.identifier) != null) {
            appList = JSON.parse(window.localStorage.getItem(MY_PLUGIN.identifer));
          } else {
            appList = [];
          }
          projectInfo.location = res.location;
          appList.push(projectInfo);
          window.localStorage.setItem(MY_PLUGIN.identifier, JSON.stringify(appList));
        });
    });
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
