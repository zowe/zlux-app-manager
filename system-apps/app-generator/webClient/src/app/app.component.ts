
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, ViewEncapsulation, ViewChild, AfterViewInit, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { ZoweApplication } from "./shared/models/application";

@Component({
	selector: "app-root",
	encapsulation: ViewEncapsulation.None,
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"]
})
export class AppComponent implements AfterViewInit, OnInit {
	appList: any;

	constructor(private http: HttpClient) {
    this.appList = [];
	}

  createCallback() {
    var t = this;
    return function(plugin) {
      t.appList.push(plugin);
    }
  }

	ngOnInit() {
    const MY_PLUGIN_ID = ZoweZLUX.iframe.pluginDef.basePlugin.identifier;
    ZoweZLUX.pluginManager.getPlugin(MY_PLUGIN_ID).then(plugin => {
      ZoweZLUX.uriBroker.pluginRESTUri(plugin,'gen','project/get').then(uri => {
        this.http.get(uri)
          .subscribe((res:any)=> {
            this.appList = res;
            window.localStorage.setItem(MY_PLUGIN_ID, JSON.stringify(res));
            /*
            setInterval(()=> {
              this.appList = JSON.parse(window.localStorage.getItem(MY_PLUGIN_ID));
            },1000);
            */
          });
      });
    })
	}

	ngAfterViewInit() {

	}
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
