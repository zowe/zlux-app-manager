/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';


export interface ProxyServerResult {
  port: number;
}

@Injectable()
export class ProxyService {
  readonly proxyServiceURL: string;

  constructor(
    private http: HttpClient,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION)
    private pluginDefinition: ZLUX.ContainerPluginDefinition,
  ) {
    this.proxyServiceURL = ZoweZLUX.uriBroker.pluginRESTUri(this.pluginDefinition.getBasePlugin(), 'proxy', '');
  }

  create(urlString: string): Observable<ProxyServerResult> {
    const url = new URL(urlString);
    const target = `${url.protocol}//${url.host}`;
    return this.http.post<ProxyServerResult>(this.proxyServiceURL, { url: target });
  }

  delete(port: number): Observable<void> {
    return this.http.delete<void>(`${this.proxyServiceURL}?port=${port}`);
  }
}



/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
