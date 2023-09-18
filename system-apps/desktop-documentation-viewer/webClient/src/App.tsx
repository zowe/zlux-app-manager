/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import * as React from 'react';
import { MemoryRouter, Route } from 'react-router';
import Main from './Main';
import DocView from './docView';
import { withTranslation } from 'react-i18next';

class App extends React.Component<any, any> {
  private log: ZLUX.ComponentLogger;
  t: any;
  constructor(props){
    super(props);
    this.log = this.props.resources.logger;
    this.state = this.getDefaultState();
  };

  private getDefaultState() {
    return {
      code: "",
      docsList: "",
      pluginIdentifier: "",
      language: "",
      /* List of plugins stored inside a nested angular object. This can be improved by 
         finding a workaround to get the list in more better way.
      */
      allPlugins: ZoweZLUX.pluginManager.loadPlugins("application", false).__zone_symbol__value,
      destination: ZoweZLUX.uriBroker.pluginRESTUri(this.props.resources.pluginDefinition.getBasePlugin(), 'plugindetail', "")
    };
  }

  updateOrInitState(stateUpdate: any): void {
    if (!this.state) {
      this.state = Object.assign(this.getDefaultState(), stateUpdate);
    }
    else {
      this.setState(stateUpdate);
    }
  }

  getPluginsFromServer() {
    let allPlugins = ZoweZLUX.pluginManager.loadPlugins("application", false);
    this.updateOrInitState({allPlugins: allPlugins.__zone_symbol__value})
  }

  getPluginDocsInfoFromServer(identifier: string) {
    let url = ZoweZLUX.uriBroker.pluginRESTUri(this.props.resources.pluginDefinition.getBasePlugin(), 'plugindetail', 'docs/'+`${identifier}`);
    fetch(url, {
      method: 'GET'
    })
      .then(res => {
        this.log.info(`Res=${res}`);
        res.json()
          .then((responseJson) => {
            if (responseJson) {
              this.setState({
                pluginIdentifier: identifier,
                docsList: responseJson.doc
              });
            }
          })
      });
  }

  retrieveDocFromServer(identifier: string, path: string, x: any) {
    let url = ZoweZLUX.uriBroker.pluginRESTUri(this.props.resources.pluginDefinition.getBasePlugin(), 'plugindetail', `${identifier}`);
    let language: any = path.split("/")
    language = language[language.length - 1]
    language = language.split(".")[1]
    fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "identifier": identifier,
        "docLocation": path,
      }),
    })
      .then(res => {
        this.log.info(res);
        res.text()
        .then((response) => {
          this.log.info(response);
          if (response) {
            this.setState({
              code: response,
              language: language
            });
          }
        })
      });
    x.push('/docview');
  }

  public render(): JSX.Element {
    const { t } = this.props;
    this.t = t;
    return (
        <MemoryRouter
          initialEntries={[
            '/main'
          ]}>
        <div>
          <Route path="/main"
            render={(props) =>
              <Main {...props}
                allPlugins={this.state.allPlugins}
                docsList={this.state.docsList}
                pluginIdentifier={this.state.pluginIdentifier}
                retrieveDocFromServer={this.retrieveDocFromServer.bind(this)}
                getPluginDocsInfoFromServer={this.getPluginDocsInfoFromServer.bind(this)}
                getPluginsFromServer={this.getPluginsFromServer.bind(this)}
              />}
          />
          <Route path="/docview"
            render={(props) =>
            <DocView {...props}
              code={this.state.code}
              language={this.state.language}
            />}
          />
        </div>
        </MemoryRouter>
    );
  }
}

export default withTranslation('translation')(App);
