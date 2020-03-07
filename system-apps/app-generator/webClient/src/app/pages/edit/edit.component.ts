
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
import { ActivatedRoute } from '@angular/router';

var MY_PLUGIN_ID = 'org.zowe.generator';
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
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss']
})
export class EditComponent implements OnInit {
  pluginConfig: ZoweApplication;
  locationMatch = false;

  constructor(private http: HttpClient, private route: ActivatedRoute) {
    this.http.get('/server/proxies').subscribe((res:any)=> {
      this.locationMatch = (window.location.hostname == res.zssServerHostName)
        || res.zssServerHostName == 'localhost'
        || res.zssServerHostName == '127.0.0.1';
    });
    this.pluginConfig = Object.assign({},STARTING_CONFIG);
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (window.localStorage.getItem(MY_PLUGIN_ID) != null) {
        let storage = JSON.parse(window.localStorage.getItem(MY_PLUGIN_ID))
        for (let i = 0; i < storage.length; i++) {
          if (storage[i].identifier == params.id) {
            this.pluginConfig = storage[i];
            break;
          }
        }
      }
    });
  }

  ngAfterViewInit() {
  }

  get pluginText() {
    return JSON.stringify(this.pluginConfig,null,2);
  }

  updateApp() {
    let projectInfo = Object.assign({}, STARTING_CONFIG, this.pluginConfig);

    this.http.put(`/ZLUX/plugins/org.zowe.generator/services/gen/1.0.0/project/edit`, projectInfo)
      .subscribe((res) => {
        console.log("==============> " + res);
        let storage = JSON.parse(window.localStorage.getItem(MY_PLUGIN_ID))
        for (let i = 0; i < storage.length; i++) {
          if (storage[i].identifier == (res as any).identifier) {
            storage[i] = res;
            window.localStorage.setItem(MY_PLUGIN_ID, JSON.stringify(storage));
            break;
          }
        }
      });
  }

  editReason() {
    if (this.canEdit()) {
      return 'Open in Code Editor';
    } else if (!this.locationMatch) {
      return 'Agent and App Server on different hosts. Edit on App Server host instead.';
    } else if (!this.pluginConfig.location) {
      return 'Location of plugin unknown';
    } else {
      return 'Editor not found';
    }
  }

  canEdit() {
    let window2 = (window as any);
    let pluginManager = window2.ZoweZLUX.pluginManager;
    let plugin = pluginManager.getPlugin('org.zowe.editor');
    return plugin && this.locationMatch && this.pluginConfig.location;
  }

  openEditor(pluginConfig) {
    console.log('do something about',pluginConfig);
    let req = { 
      type: 'openDir',
      name: pluginConfig.location
    }
    let dispatcher = (window as any).ZoweZLUX.dispatcher;
    dispatcher.makeAction('org.zowe.editor.openDir','Open Directory',
                          dispatcher.constants.ActionTargetMode.PluginFindAnyOrCreate,
                          dispatcher.constants.ActionType.Launch,
                          'org.zowe.editor',
                          {data: {op:'deref',source:'event',path:['data']}}).then((action:any)=> {
                            dispatcher.invokeAction(action, {'data':req});
                          });
  }

  deleteApp(id: string) {
    this.http.delete(`/ZLUX/plugins/org.zowe.generator/services/gen/1.0.0/project/delete/${id}`)
      .subscribe((res) => {
        let storage = JSON.parse(window.localStorage.getItem(MY_PLUGIN_ID))
        for (let i = 0; i < storage.length; i++) {
          if (storage[i].identifier == id) {
            storage.splice(i,1);
            window.localStorage.setItem(MY_PLUGIN_ID, JSON.stringify(storage));
            break;
          }
        }
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
