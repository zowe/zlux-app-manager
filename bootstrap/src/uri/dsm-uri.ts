

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { PluginManager } from 'zlux-base/plugin-manager/plugin-manager' 

const proxy_path = 'zowe-zlux';
const proxy_mode = (window.location.pathname.split('/')[1] == proxy_path) ? true : false;

export class DsmUri implements ZLUX.UriBroker {

  private proxyURL(url: string): string {
    return proxy_mode ? `/${proxy_path}${url}` : url;
  }

  rasUri(relativePath: string): string {
    relativePath;//suppress warning for now
    return "";
  }
  unixFileUri(route: string, absPath: string,
              sourceEncodingOrOptions?: string|ZLUX.UnixFileUriOptions, targetEncoding?: string,
               newName?: string, forceOverwrite?: boolean, sessionID?: number,
               lastChunk?: boolean, responseType?: string): string {
    //suppress warning for now
    route;
    absPath;
    sourceEncodingOrOptions;
    targetEncoding;
    newName;
    forceOverwrite;
    sessionID;
    lastChunk;
    responseType;
    return "";
  }
  omvsSegmentUri(): string {
    return `${this.serverRootUri('omvs')}`;
  }
  datasetContentsUri(relativePath: string): string {
    relativePath;//suppress warning for now
    return "";
  }
  VSAMdatasetContentsUri(relativePath: string, closeAfter?: boolean): string {
    relativePath;//suppress warning for now
    closeAfter;
    return "";
  }
  datasetMetadataHlqUri(updateCache?: boolean | undefined, types?: string | undefined, workAreaSize?: number | undefined, resumeName?: string | undefined, resumeCatalogName?: string | undefined): string {
    updateCache;
    types;
    workAreaSize;
    resumeName;
    resumeCatalogName;
    return "";
  }
  datasetMetadataUri(relativePath: string, detail?: string | undefined, types?: string | undefined, listMembers?: boolean | undefined, workAreaSize?: number | undefined, includeMigrated?: boolean | undefined, includeUnprintable?: boolean | undefined, resumeName?: string | undefined, resumeCatalogName?: string | undefined): string {
    relativePath;
    detail;
    types;
    listMembers;
    workAreaSize;
    includeMigrated;
    includeUnprintable;
    resumeName;
    resumeCatalogName;
    return "";
  }

  serverRootUri(uri: string): string {
    uri;
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
      throw new Error("The desktop plugin has not been bootstrapped");
    }
  }

  pluginResourceUri(pluginDefinition: ZLUX.Plugin, relativePath: string): string {
    if (relativePath == null) {
      relativePath = "";
    }    
    return this.pluginServletUri()+`?pluginResourceUri=${this.pluginRootUri(pluginDefinition)}/${relativePath}`
  }

  pluginListUri(pluginType?: ZLUX.PluginType): string {
    if (pluginType === undefined) {
      return this.pluginServletUri()+`?pluginType=all`
    }
    return this.pluginServletUri()+`?pluginType=${pluginType}`
  }

  pluginWSUri(pluginDefinition: ZLUX.Plugin, serviceName:string, 
        relativePath: string, version = "_current"){
    if (relativePath == null) {
      relativePath = "";
    }        
    //const protocol = window.location.protocol;
    //const wsProtocol = (protocol === 'https:') ? 'wss:' : 'ws:';        
    // return protocol+'://'+host+`/ZLUX/plugins/${pluginDefinition.getIdentifier()}/services/data`+relativePath;
    console.warn("pluginWSUri not implemented yet!", pluginDefinition, 
        serviceName, relativePath, version);
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

