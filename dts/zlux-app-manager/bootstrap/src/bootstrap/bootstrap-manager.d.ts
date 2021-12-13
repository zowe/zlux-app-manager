export declare class BootstrapManager {
    private static bootstrapPerformed;
    private static bootstrapGlobalResources;
    private static bootstrapDesktopPlugin;
    static bootstrapDesktopAndInject(): void;
    static bootstrapDesktop(injectionCallback: (plugin: ZLUX.Plugin) => Promise<void>): void;
}
