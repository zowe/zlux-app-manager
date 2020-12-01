

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { PluginManager } from 'zlux-base/plugin-manager/plugin-manager' 
import { bootstrapLogger } from '../bootstrap/dsm-resources'

const proxy_path = 'zowe-zlux';
const proxy_mode = (window.location.pathname.split('/')[1] == proxy_path) ? true : false;

export class DsmUri implements ZLUX.UriBroker {

  private proxyURL(url: string): string {
    return proxy_mode ? `/${proxy_path}${url}` : url;
  }

  rasUri(_relativePath: string): string {
    return "";
  }
  unixFileUri(_route: string, _absPath: string,
              _sourceEncodingOrOptions?: string|ZLUX.UnixFileUriOptions, _targetEncoding?: string,
              _newName?: string, _forceOverwrite?: boolean, _sessionID?: number,
              _lastChunk?: boolean, _responseType?: string): string {
    return "";
  }
  omvsSegmentUri(): string {
    return `${this.serverRootUri('omvs')}`;
  }

  
  datasetContentsUri(_dsn: string): string {
    return "";
  } 
  datasetEnqueueUri(_relativePath: string): string {
    return "";
  } 
  VSAMdatasetContentsUri(_relativePath: string, _closeAfter?: boolean): string {
    return "";
  }
  datasetMetadataHlqUri(_updateCache?: boolean | undefined, _types?: string | undefined, 
                        _workAreaSize?: number | undefined, _resumeName?: string | undefined, _resumeCatalogName?: string | undefined): string {
    return "";
  }
  datasetMetadataUri(_relativePath: string, _detail?: string | undefined, _types?: string | undefined, 
                      _listMembers?: boolean | undefined, _workAreaSize?: number | undefined, _includeMigrated?: boolean | undefined, 
                      _includeUnprintable?: boolean | undefined, _resumeName?: string | undefined, _resumeCatalogName?: string | undefined, 
                      _addQualifiers?: string | undefined): string {
    return "";
  }

  serverRootUri(_uri: string): string {
    return "";
  }

  pluginRootUri(pluginDefinition: ZLUX.Plugin): string {
    return this.proxyURL(`/ZLUX/plugins/${pluginDefinition.getIdentifier()}/web/`);
  }

  desktopRootUri(): string {
    const desktopPlugin = PluginManager.getDesktopPlugin();
    if (desktopPlugin != null) {
      return this.pluginServletUri() + `?pluginResourceUri=` + this.pluginRootUri(desktopPlugin);
    } else {
      throw new Error("ZWED5014E - The desktop plugin has not been bootstrapped");
    }
  }

  pluginResourceUri(pluginDefinition: ZLUX.Plugin, relativePath: string): string {
    if (relativePath == null) {
      relativePath = "";
    }    
    return this.pluginServletUri()+`?pluginResourceUri=${this.pluginRootUri(pluginDefinition)}/${relativePath}`
  }

  pluginListUri(pluginType?: ZLUX.PluginType, refresh?: boolean): string {
    let query;
    if (pluginType === undefined) {
      query = `plugins?type=all`;
    } else {
      query = `plugins?type=${pluginType}`
    }
    if (refresh) {
      query += `&refresh=true`;
    }
    return `${this.serverRootUri(query)}`;
  }

  pluginWSUri(pluginDefinition: ZLUX.Plugin, serviceName:string, 
        relativePath: string, version = "_current"){
    if (relativePath == null) {
      relativePath = "";
    }        
    //const protocol = window.location.protocol;
    //const wsProtocol = (protocol === 'https:') ? 'wss:' : 'ws:';        
    // return protocol+'://'+host+`/ZLUX/plugins/${pluginDefinition.getIdentifier()}/services/data`+relativePath;
    bootstrapLogger.warn("ZWED5001W", pluginDefinition, serviceName, relativePath, version); //console.warn("pluginWSUri not implemented yet!", pluginDefinition, 
        //serviceName, relativePath, version);
    return "";
  }

  /**
   * This method should only be used for administrative UI's where the user has sufficient privilege
   * to create/modify/delete configs at the group, instance, or site "scopes". End user UI that is consuming configs
   * should use plubinConfigUri
   * @param pluginDefinition 
   * @param scope 
   * @param resourcePath 
   * @param [resourceName] 
   */
  pluginConfigForScopeUri(pluginDefinition: ZLUX.Plugin, scope: string, resourcePath:string, resourceName?:string): string {
    let name = resourceName ? '?name='+resourceName : '';    
    return this.pluginServletUri()+`?pluginRESTUri=/ZLUX/plugins/org.zowe.configjs`
        + `/services/data/_current/${pluginDefinition.getIdentifier()}/${scope}/`
        + `${resourcePath}${name}`;
  }

  /**
     Note: This may be unimplemented for /config, and if DSM is equipped for it, should rely on /ZLUX/plugins/org.zowe.configjs/services/data instead
  */
  /* Disabled for now, to be re-introduced with role-based access control use
  pluginConfigForUserUri(pluginDefinition: ZLUX.Plugin, user:string, resourcePath:string, resourceName?:string) {
    let name = resourceName ? '?name='+resourceName : '';    
    return this.proxyURL(`/ZLUX/plugins/org.zowe.configjs/services/data/_current`
        + `/${pluginDefinition.getIdentifier()}/users/${user}/${resourcePath}${name}`);    
  }
  */
  /**
     Note: This may be unimplemented for /config, and if DSM is equipped for it, should rely on /ZLUX/plugins/org.zowe.configjs/services/data instead
  */
  /* Disabled for now, to be re-introduced with role-based access control use  
  pluginConfigForGroupUri(pluginDefinition: ZLUX.Plugin, group:string, resourcePath:string, resourceName?:string) {
    let name = resourceName ? '?name='+resourceName : '';    
    return this.proxyURL(`/ZLUX/plugins/org.zowe.configjs/services/data/_current`
        + `/${pluginDefinition.getIdentifier()}/group/${group}/${resourcePath}${name}`);    
  }  */
  
  pluginConfigUri(pluginDefinition: ZLUX.Plugin, resourcePath:string, resourceName?:string) {
    return this.pluginConfigForScopeUri(pluginDefinition, "user", resourcePath, resourceName);
  }
  
  pluginRESTUri(plugin:ZLUX.Plugin, serviceName: string, relativePath:string, 
        version = "_current"){
    if (relativePath == null) {
      relativePath = "";
    }    
    return this.pluginServletUri()+`?pluginRESTUri=/ZLUX/plugins/`
        + `${plugin.getIdentifier()}/services/${serviceName}/${version}/${relativePath}`;
  }

  private pluginServletUri(){
    return `../dsm/proxy/ZluxProxyServlet`;
  }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

