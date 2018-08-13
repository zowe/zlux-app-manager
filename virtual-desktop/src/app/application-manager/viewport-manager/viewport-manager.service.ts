

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';
import { Viewport } from './viewport';
// import { InstanceId } from '../application-instance';

@Injectable()
export class ViewportManager implements MVDHosting.ViewportManagerInterface {
  private viewports: Map<MVDHosting.ViewportId, Viewport>;
  private viewportInstances: Map<MVDHosting.ViewportId, MVDHosting.InstanceId>;

  constructor() {
    this.viewports = new Map();
    this.viewportInstances = new Map();
  }

  createViewport(providers: Map<string, any>): MVDHosting.ViewportId {
    const viewport = new Viewport(providers);
    this.viewports.set(viewport.viewportId, viewport);

    return viewport.viewportId;
  }

  registerViewport(viewportId: MVDHosting.ViewportId, instanceId: MVDHosting.InstanceId): void {
    if (this.viewportInstances.has(viewportId)) {
      console.warn('Attempting to replace an existing viewport id in registration');
    }

    this.viewportInstances.set(viewportId, instanceId);
  }

  destroyViewport(viewportId: MVDHosting.ViewportId): void {
    // TODO
    console.log(`we've said we will destroy the viewport... id=${viewportId}`);
  }

  getApplicationInstanceId(viewportId: MVDHosting.ViewportId): MVDHosting.InstanceId | null {
    const id = this.viewportInstances.get(viewportId);

    if (id != null) {
      return id;
    } else {
      return null;
    }
  }

  getViewport(viewportId: MVDHosting.ViewportId): Viewport | null {
    return this.viewports.get(viewportId) || null;
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

