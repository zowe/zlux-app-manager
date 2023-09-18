/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import * as React from 'react';
const styles = require('./App.css');
const indexStyles = require('./index.css');
import { withTranslation } from 'react-i18next';


class Main extends React.Component<any, any> {
  public render(): JSX.Element {
    const { t } = this.props;

    function serializePlugin(args) {
      let allPlugins = args.allPlugins;
      let pluginsList = allPlugins.map(function(plugin) {
        if (plugin._definition.webContent) {
          return (
            <li key={plugin.identifier}>{plugin._definition.webContent.launchDefinition.pluginShortNameDefault}
            <button type="button" onClick={()=> args.getPluginDocsInfoFromServer(plugin.identifier)}>{t('Get List of Docs')}</button>
            </li>
          )
        }
      })
      return pluginsList
    }

    function serializeDocs(args) {
      if (typeof args.docsList === "string") {
        return (
          <li>
            {args.docsList}
          </li>
        )
      } else {
        let docList = args.docsList.map(function(doc) {
          return (
            <tr key={args.pluginIdentifier}>
              <th>{doc[0]}</th>
              <th>
                <button
                  type="button"
                  onClick={() => {args.retrieveDocFromServer(args.pluginIdentifier, '/doc' + doc[1], args.history);}}>
                  {t('Get Doc')}
                </button>
              </th>
            </tr>
          )
        }) 
        return docList
      }
    }
  
    return (
      <>
      <div className={`${styles.App} ${indexStyles.body}`}>
        <header className={styles['App-header']}>Zowe Documentation Viewer</header>
        {this.props.allPlugins &&
        <table>
          <tr>
            <th>Plugin Name</th>
            <th>Empty</th>
          </tr>
          {serializePlugin(this.props)}
        </table>}
      </div>
      <div>
        {this.props.docsList &&
        <table>
          <tr>
            <th>Doc Name</th>
            <th>View Doc</th>
          </tr>
          {serializeDocs(this.props)}
        </table>}
      </div>
      </>
    );
  }
}

export default withTranslation('translation')(Main);
