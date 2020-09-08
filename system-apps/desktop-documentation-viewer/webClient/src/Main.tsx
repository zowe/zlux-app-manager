/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import * as React from 'react';
import 'script-loader!./App-css.js';
import { withTranslation } from 'react-i18next';

declare var styles: any;

function mergeStyles(...args: any[]) {
  let obj = {};
  for (let i = 0; i < args.length; i++) {
    Object.assign(obj, args[i]);
  }
  return obj;
}


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
            <li key={args.pluginIdentifier}>{doc[0]}
            <button type="button" onClick={() => { 
              args.postDocToServer(args.pluginIdentifier, '/doc' + doc[1]);
              }}>{t('Get Doc')}</button>
            </li>
          )
        }) 
        return docList
      }
    }
  
    return (
      <>
      <div>
        <header style={mergeStyles(styles.AppHeader, styles.App)}>Zowe Documentation Viewer</header>
        {this.props.allPlugins && <ul>{serializePlugin(this.props)}</ul>}
        <button style={mergeStyles(styles.iframeButton, styles.shadowed, styles.App)} type="button" onClick={this.props.getPluginsFromServer}>{t('Refresh')}</button>
      </div>
      <div>
        {this.props.docsList && <ul>{serializeDocs(this.props)}</ul>}
      </div>
      </>
    );
  }
}

export default withTranslation('translation')(Main);
