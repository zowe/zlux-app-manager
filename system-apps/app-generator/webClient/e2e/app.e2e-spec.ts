
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { CarbonAngularStarterPage } from "./app.po";

describe("carbon-angular-starter App", () => {
	let page: CarbonAngularStarterPage;

	beforeEach(() => {
		page = new CarbonAngularStarterPage();
	});

	it("should display message saying app works", () => {
		page.navigateTo();
		expect(page.getParagraphText()).toEqual("app works!");
	});
});

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
