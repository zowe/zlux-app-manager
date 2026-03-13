
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { CreateComponent } from "./create/create.component";
import { EditComponent } from "./edit/edit.component";
import { LandingComponent } from "./landing/landing.component";


const routes: Routes = [
	{
		path: "",
		component: LandingComponent
	},
	{
		path: "create",
		component: CreateComponent
	},
	{
		path: "edit/:id",
		component: EditComponent
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule]
})
export class PagesRoutingModule { }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
