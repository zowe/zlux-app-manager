/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import * as React from 'react';
const styles = require('./App.css');
import { withTranslation } from 'react-i18next';
import MonacoEditor from 'react-monaco-editor'


class DocView extends React.Component<any, any> {
  constructor(props){
    super(props);
  }

  onChange(newValue, e) {
    console.log('onChange', newValue, e);
  }

  public render(): JSX.Element {
    const {t} = this.props;
  
    return (
      <>
      <div><button onClick={()=>this.props.history.push('/main')}>Back</button></div>
      <div>
        <MonacoEditor
          width="900"
          height="300"
          language="yaml"
          theme="vs-dark"
          defaultValue=''
          value={this.props.code}
          onChange={this.onChange}
        />
      </div>
      </>
    );
  }
}

export default withTranslation('translation')(DocView);
