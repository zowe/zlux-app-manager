export declare class Environment implements ZLUX.Environment {
    private _cache;
    get(key: string): Promise<string | undefined>;
    getComponentGroups(): Promise<string[] | undefined>;
    getExternalComponents(): Promise<string[] | undefined>;
    getAgentConfig(): Promise<ZLUX.AgentConfig | undefined>;
    getGatewayPort(): Promise<number | undefined>;
    getGatewayHost(): Promise<string | undefined>;
    getPlatform(): Promise<string>;
    getArch(): Promise<string>;
    getTime(): Promise<Date>;
    private _queryServer;
}
