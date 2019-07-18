

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { PluginManager } from 'zlux-base/plugin-manager/plugin-manager'

const uri_prefix = window.location.pathname.split('ZLUX/plugins/')[0];
const proxy_mode = (uri_prefix !== '/') ? true : false; // Tells whether we're behind API layer (true) or not (false)

export class MvdUri implements ZLUX.UriBroker {
  rasUri(uri: string): string {
    return `${this.serverRootUri(`ras/${uri}`)}`;
  }
  unixFileUri(route: string, absPath: string,
              sourceEncodingOrOptions?: string|ZLUX.UnixFileUriOptions, targetEncoding?: string,
              newName?: string, forceOverwrite?: boolean, sessionID?: number,
              lastChunk?: boolean, responseType?: string): string {
    let options;
    if (typeof sourceEncodingOrOptions == 'object') {
      options = sourceEncodingOrOptions;
    } else {
      options = { sourceEncoding: sourceEncodingOrOptions,
                  targetEncoding,
                  newName,
                  forceOverwrite,
                  sessionID,
                  lastChunk,
                  responseType };
    }
    if (!options.responseType) {
      options.responseType = 'raw';
    }

    let paramArray = new Array<string>();
    (Object as any).entries(options).forEach(([key,value]:any[])=>{
      if (value !== undefined) {
        paramArray.push(`${key}=${value}`);
      }
    });
    let params = this.createParamURL(paramArray);
    let routeParam = route;
    let absPathParam = encodeURIComponent(absPath);
    
    return `${this.serverRootUri(`unixfile/${routeParam}/${absPathParam}${params}`)}`;
  }
  omvsSegmentUri(): string {
    return `${this.serverRootUri('omvs')}`;
  }
  datasetContentsUri(dsn: string): string {
    return `${this.serverRootUri(`datasetContents/${encodeURIComponent(dsn)}`)}`;
  }
  VSAMdatasetContentsUri(dsn: string, closeAfter?: boolean): string {
    let closeAfterParam = closeAfter ? '?closeAfter=' + closeAfter : '';
    return `${this.serverRootUri(`VSAMdatasetContents/${dsn}${closeAfterParam}`)}`;
  }
  datasetMetadataHlqUri(updateCache?: boolean | undefined, types?: string | undefined, workAreaSize?: number | undefined, resumeName?: string | undefined, resumeCatalogName?: string | undefined): string {
    let updateCacheParam = updateCache ? 'updateCache=' + updateCache : '';
    let typesParam = types ? 'types=' + types : '';
    let workAreaSizeParam = workAreaSize ? 'workAreaSize=' + workAreaSize : '';
    let resumeNamesParam = resumeName ? 'resumeName=' + resumeName : '';
    let resumeCatalogNameParam = resumeCatalogName ? 'resumeCatalogName=' + resumeCatalogName : '';

    let paramArray = [updateCacheParam, typesParam, workAreaSizeParam, resumeNamesParam, resumeCatalogNameParam];
    let params = this.createParamURL(paramArray);

    return `${this.serverRootUri(`datasetMetadata/hlq${params}`)}`;
  }
  datasetMetadataUri(dsn: string, detail?: string | undefined, types?: string | undefined, listMembers?: boolean | undefined, workAreaSize?: number | undefined, includeMigrated?: boolean | undefined, includeUnprintable?: boolean | undefined, resumeName?: string | undefined, resumeCatalogName?: string | undefined): string {
    let detailParam = detail ? 'detail=' + detail : '';
    let typesParam = types ? 'types=' + types : '';
    let workAreaSizeParam = workAreaSize ? 'workAreaSize=' + workAreaSize : '';
    let listMembersParam = listMembers ? 'listMembers=' + listMembers : '';
    let includeMigratedParam = includeMigrated ? 'includeMigrated=' + includeMigrated : '';
    let includeUnprintableParam = includeUnprintable ? 'includeUnprintable=' + includeUnprintable : '';
    let resumeNameParam = resumeName ? 'resumeName=' + resumeName : '';
    let resumeCatalogNameParam = resumeCatalogName ? 'resumeCatalogName=' + resumeCatalogName : '';

    let paramArray = [detailParam, typesParam, workAreaSizeParam, listMembersParam, includeMigratedParam, includeUnprintableParam, resumeNameParam, resumeCatalogNameParam];
    let params = this.createParamURL(paramArray);
    return `${this.serverRootUri(`datasetMetadata/name/${dsn}${params}`)}`;
  }
  pluginRootUri(pluginDefinition: ZLUX.Plugin): string {
    return `${this.serverRootUri(`ZLUX/plugins/${pluginDefinition.getIdentifier()}/`)}`;
    //return `/ZLUX/plugins/${pluginDefinition.getIdentifier()}/`;
  }

  desktopRootUri(): string {
    const desktopPlugin = PluginManager.getDesktopPlugin();
    if (desktopPlugin != null) {
      return this.pluginResourceUri(desktopPlugin, "");
    } else {
      throw new Error("The desktop plugin has not been bootstrapped");
    }
  }

  serverRootUri(uri: string): string {
    return `${uri_prefix}${uri}`;
  }

  pluginResourceUri(pluginDefinition: ZLUX.Plugin, relativePath: string): string {
    if (relativePath == null) {
      relativePath = "";
    }
    return `${this.pluginRootUri(pluginDefinition)}web/${relativePath}`;
  }

  pluginListUri(pluginType?: ZLUX.PluginType): string {
    if (pluginType === undefined) {
      return `${this.serverRootUri(`plugins?type=all`)}`;
    }
    return `${this.serverRootUri(`plugins?type=${pluginType}`)}`;
  }

  pluginWSUri(plugin: ZLUX.Plugin, serviceName: string, relativePath: string,
        version = "_current") {
    if (relativePath == null) {
      relativePath = "";
    }
    const protocol = window.location.protocol;
    const wsProtocol = (protocol === 'https:') ? 'wss:' : 'ws:';
    const uri = `${wsProtocol}//${window.location.host}${this.pluginRootUri(plugin)}`
        + `services/${serviceName}/${version}/${relativePath}`;
    // This is a workaround for the mediation layer not having a dynamic way to get the websocket uri for zlux
    // Since we know our uri is /ui/v1/zlux/ behind the api-layer we replace the ui with ws to get /ws/v1/zlux/
    return proxy_mode ? uri.replace('/ui/', '/ws/') : uri;
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
  pluginConfigForScopeUri(pluginDefinition: ZLUX.Plugin, scope: string, resourcePath: string, resourceName?: string): string {
    let name = resourceName ? '?name=' + resourceName : '';
    return `${this.serverRootUri(`ZLUX/plugins/org.zowe.configjs/services/data/_current`
       + `/${pluginDefinition.getIdentifier()}/${scope}/${resourcePath}${name}`)}`;
    // return `/ZLUX/plugins/org.zowe.configjs/services/data/${pluginDefinition.getIdentifier()}/${scope}/${resourcePath}${name}`;
  }

  /* Disabled for now, to be re-introduced with role-based access control use  
  pluginConfigForUserUri(pluginDefinition: ZLUX.Plugin, user: string, resourcePath: string, resourceName?: string) {
    let name = resourceName ? '?name=' + resourceName : '';
    return `${this.serverRootUri(`ZLUX/plugins/org.zowe.configjs/services/data/_current`
       + `/${pluginDefinition.getIdentifier()}/users/${user}/${resourcePath}${name}`)}`;
    // return `/ZLUX/plugins/org.zowe.configjs/services/data/${pluginDefinition.getIdentifier()}/users/${user}/${resourcePath}${name}`;    
  }

  pluginConfigForGroupUri(pluginDefinition: ZLUX.Plugin, group: string, resourcePath: string, resourceName?: string) {
    let name = resourceName ? '?name=' + resourceName : '';
    return `${this.serverRootUri(`ZLUX/plugins/org.zowe.configjs/services/data/_current`
       + `/${pluginDefinition.getIdentifier()}/group/${group}/${resourcePath}${name}`)}`;
    //return `/ZLUX/plugins/org.zowe.configjs/services/data/${pluginDefinition.getIdentifier()}/group/${group}/${resourcePath}${name}`;    
  }
  */
  
  pluginConfigUri(pluginDefinition: ZLUX.Plugin, resourcePath: string, resourceName?: string) {
    return this.pluginConfigForScopeUri(pluginDefinition, "user", resourcePath, resourceName);
  }

  pluginRESTUri(plugin: ZLUX.Plugin, serviceName: string, relativePath: string,
        version = "_current") {
    if (relativePath == null) {
      relativePath = "";
    }
    return `${this.pluginRootUri(plugin)}services/${serviceName}/${version}`
       + `/${relativePath}`;
  }

  createParamURL(parameters: String[]): string {
    let parametersFiltered = parameters.filter(String);
    let paramUrl = '';
    if (parametersFiltered.length == 0) {
      return paramUrl;
    } else {
      paramUrl = '?';
      for (let param of parametersFiltered) {
        paramUrl = paramUrl + param + '&';
      }
      paramUrl = paramUrl.substring(0, paramUrl.length - 1);
    }
    return paramUrl;
  }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

