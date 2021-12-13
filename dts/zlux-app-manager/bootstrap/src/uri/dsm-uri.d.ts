export declare class DsmUri implements ZLUX.UriBroker {
    private proxyURL;
    rasUri(_relativePath: string): string;
    unixFileUri(_route: string, _absPath: string, _sourceEncodingOrOptions?: string | ZLUX.UnixFileUriOptions, _targetEncoding?: string, _newName?: string, _forceOverwrite?: boolean, _sessionID?: number, _lastChunk?: boolean, _responseType?: string, _mode?: string, _recursive?: boolean, _user?: string, _group?: string, _type?: ZLUX.TagType, _codeset?: number): string;
    omvsSegmentUri(): string;
    datasetContentsUri(_relativePath: string): string;
    VSAMdatasetContentsUri(_relativePath: string, _closeAfter?: boolean): string;
    datasetMetadataHlqUri(_updateCache?: boolean | undefined, _types?: string | undefined, _workAreaSize?: number | undefined, _resumeName?: string | undefined, _resumeCatalogName?: string | undefined): string;
    datasetMetadataUri(_relativePath: string, _detail?: string | undefined, _types?: string | undefined, _listMembers?: boolean | undefined, _workAreaSize?: number | undefined, _includeMigrated?: boolean | undefined, _includeUnprintable?: boolean | undefined, _resumeName?: string | undefined, _resumeCatalogName?: string | undefined, _addQualifiers?: string | undefined): string;
    agentRootUri(_uri: string): string;
    serverRootUri(_uri: string): string;
    pluginRootUri(pluginDefinition: ZLUX.Plugin): string;
    desktopRootUri(): string;
    pluginResourceUri(pluginDefinition: ZLUX.Plugin, relativePath: string): string;
    pluginIframeUri(pluginDefinition: ZLUX.Plugin, relativePath: string): string;
    pluginListUri(pluginType?: ZLUX.PluginType, refresh?: boolean): string;
    pluginWSUri(pluginDefinition: ZLUX.Plugin, serviceName: string, relativePath: string, version?: string): string;
    /**
     * This method should only be used for administrative UI's where the user has sufficient privilege
     * to create/modify/delete configs at the group, instance, or site "scopes". End user UI that is consuming configs
     * should use plubinConfigUri
     * @param pluginDefinition
     * @param scope
     * @param resourcePath
     * @param [resourceName]
     */
    pluginConfigForScopeUri(pluginDefinition: ZLUX.Plugin, scope: string, resourcePath: string, resourceName?: string): string;
    /**
       Note: This may be unimplemented for /config, and if DSM is equipped for it, should rely on /ZLUX/plugins/org.zowe.configjs/services/data instead
    */
    /**
       Note: This may be unimplemented for /config, and if DSM is equipped for it, should rely on /ZLUX/plugins/org.zowe.configjs/services/data instead
    */
    pluginConfigUri(pluginDefinition: ZLUX.Plugin, resourcePath: string, resourceName?: string): string;
    pluginRESTUri(plugin: ZLUX.Plugin, serviceName: string, relativePath: string, version?: string): string;
    private pluginServletUri;
    userInfoUri(): string;
}
