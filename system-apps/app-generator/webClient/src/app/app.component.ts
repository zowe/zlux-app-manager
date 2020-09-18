
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
    setInterval(()=> {
      this.appList = JSON.parse(window.localStorage.getItem("org.zowe.zlux.generator"));
    },1000);
	}

  createCallback() {
    var t = this;
    return function(plugin) {
      t.appList.push(plugin);
    }
  }

  ngOnInit() { }

	ngAfterViewInit() {
    console.log("Called from ngAfterViewInit()");
    this.http.get('/ZLUX/plugins/org.zowe.zlux.generator/services/gen/_current/project/get')
      .subscribe((res:any)=> {
        this.appList = res;
        window.localStorage.setItem("org.zowe.zlux.generator", JSON.stringify(res));
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
