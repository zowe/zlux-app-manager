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
import MonacoEditor from 'react-monaco-editor';


class DocView extends React.Component<any, any> {
  constructor(props){
    super(props);
  }

  onChange(newValue, e) {
    console.log('onChange', newValue, e);
  }

  editorDidMount(editor, monaco) {
    console.log('editorDidMount', editor);
  }

  public render(): JSX.Element {
    const {t} = this.props;
    const options = {
      selectOnLineNumbers: true,
      readOnly: true
    };

    return (
      <>
      <div><button onClick={()=>this.props.history.push('/main')}>Back</button></div>
      <MonacoEditor
        width="100vh"
        height="100vh"
        language={this.props.language}
        theme="vs-dark"
        defaultValue=''
        options={options}
        value={this.props.code}
        onChange={this.onChange}
        editorDidMount={this.editorDidMount}
      />
      </>
    );
  }
}

export default withTranslation('translation')(DocView);
