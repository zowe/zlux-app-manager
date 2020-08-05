/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import './assets/i18n/i18n';

import { ReactMVDResources } from 'pluginlib/react-inject-resources';
import { MVDResources } from './mvd-resources';

export function renderPlugin(domElement: HTMLElement, resources: ReactMVDResources): void {
  ReactDOM.render(
    <MVDResources.Provider value={resources}>
      <App resources={resources}/>
    </MVDResources.Provider>,
    domElement
  );
}

export function unmountPlugin(domElement: HTMLElement): void {
  ReactDOM.unmountComponentAtNode(domElement);
}
