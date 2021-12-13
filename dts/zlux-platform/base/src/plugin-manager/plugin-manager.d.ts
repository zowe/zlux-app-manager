import { Plugin } from './plugin';
export declare class PluginManager {
    private static desktopPlugin;
    private static pluginsById;
    static logger: ZLUX.ComponentLogger;
    private static parsePluginDefinitions;
    static getPlugin(id: string): ZLUX.Plugin | undefined;
    static loadPlugins(pluginType?: ZLUX.PluginType, update?: boolean): Promise<ZLUX.Plugin[]>;
    static setDesktopPlugin(plugin: Plugin): void;
    static includeScript(scriptUrl: string): Promise<void>;
    static getDesktopPlugin(): Plugin | null;
}
