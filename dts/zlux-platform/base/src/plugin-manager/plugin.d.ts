export declare abstract class Plugin implements ZLUX.Plugin {
    abstract readonly identifier: string;
    abstract readonly version: string;
    abstract readonly type: ZLUX.PluginType;
    abstract readonly webContent: any;
    abstract readonly copyright: string;
    static parsePluginDefinition(definition: any): Plugin;
    abstract getKey(): string;
    abstract getIdentifier(): string;
    abstract getVersion(): string;
    abstract getWebContent(): any;
    abstract getType(): ZLUX.PluginType;
    abstract getCopyright(): string;
    abstract hasComponents(): boolean;
    abstract getBasePlugin(): any;
    toString(): string;
}
