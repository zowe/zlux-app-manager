import { Environment } from 'zlux-base/environment/environment';
export declare class MvdUri implements ZLUX.UriBroker {
    private environment;
    private agentPrefix;
    constructor(environment: Environment);
    fetchAgentPrefix(): Promise<string>;
    rasUri(uri: string): string;
    unixFileUri(route: string, absPath: string, sourceEncodingOrOptions?: string | ZLUX.UnixFileUriOptions, targetEncoding?: string, newName?: string, forceOverwrite?: boolean, sessionID?: number, lastChunk?: boolean, responseType?: string, mode?: string, recursive?: boolean, user?: string, group?: string, type?: ZLUX.TagType, codeset?: number): string;
    omvsSegmentUri(): string;
    datasetContentsUri(dsn: string): string;
    VSAMdatasetContentsUri(dsn: string, closeAfter?: boolean): string;
    datasetMetadataHlqUri(updateCache?: boolean | undefined, types?: string | undefined, workAreaSize?: number | undefined, resumeName?: string | undefined, resumeCatalogName?: string | undefined): string;
    datasetMetadataUri(dsn: string, detail?: string | undefined, types?: string | undefined, listMembers?: boolean | undefined, workAreaSize?: number | undefined, includeMigrated?: boolean | undefined, includeUnprintable?: boolean | undefined, resumeName?: string | undefined, resumeCatalogName?: string | undefined, addQualifiers?: string | undefined): string;
    pluginRootUri(pluginDefinition: ZLUX.Plugin): string;
    desktopRootUri(): string;
    agentRootUri(uri: string): string;
    agentRootUriAsync(uri: string): Promise<string>;
    serverRootUri(uri: string): string;
    pluginResourceUri(pluginDefinition: ZLUX.Plugin, relativePath: string): string;
    pluginIframeUri(pluginDefinition: ZLUX.Plugin, relativePath: string): string;
    pluginListUri(pluginType?: ZLUX.PluginType, refresh?: boolean): string;
    pluginWSUri(plugin: ZLUX.Plugin, serviceName: string, relativePath: string, version?: string): string;
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
    pluginConfigUri(pluginDefinition: ZLUX.Plugin, resourcePath: string, resourceName?: string): string;
    pluginRESTUri(plugin: ZLUX.Plugin, serviceName: string, relativePath: string, version?: string): string;
    userInfoUri(): string;
    createParamURL(parameters: String[]): string;
}
