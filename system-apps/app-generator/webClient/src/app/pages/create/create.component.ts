
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
import { ListItem } from "carbon-components-angular";

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
      "imageSrc": "assets/icon.png"
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
  frameworkList: Array<ListItem>;
  currentFramework: string;
  currentTemplate: string;
  templateList: any;
  templateLists: any;
  callback: any;
  private idRegexp = new RegExp("^([A-Za-z1-9.\-_])+$");
  public idIsValid: boolean = true;
  public idInvalidReason: string = '';

  constructor(private http: HttpClient) {
    this.pluginConfig = Object.assign({},STARTING_CONFIG);
    this.frameworkList = [
      {
        content: "Choose a framework",
        selected: true,
        disabled: true,
      },
      {
        content: "iframe",
        selected: false,
      },
      {
        content: "angular",
        selected: false,
      },
      {
        content: "react",
        selected: false,
      },
    ];

    this.templateLists = {
      "iframe": [{content:"Basic"}],
      "angular": [{content:"Basic"}],
      "react": [{content:"Basic"}]
    };
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
  }

  templateSelect(event: any) {
    this.pluginConfig.template = event.item.content;
  }

  frameworkSelect(event: any): void {
    this.pluginConfig.webContent.framework = event.item.content;
    this.templateList = this.templateLists[this.pluginConfig.webContent.framework];
  }

  get pluginText() {
    return JSON.stringify(this.pluginConfig,null,2);
  }

  public validateId() {
    this.idIsValid = this.idRegexp.test(this.pluginConfig.identifier);
    console.log("ID "+(this.idIsValid?'is':'isnt')+" valid");
    if (!this.idIsValid) {
      if (!this.pluginConfig.identifier) {
        this.idInvalidReason = "ID is empty";
      } else {
        this.idInvalidReason = "ID contains invalid characters. Valid characters: A-Z, 1-9, ., -, and _";
      }
    }
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
