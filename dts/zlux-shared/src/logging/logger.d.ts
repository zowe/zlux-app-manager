declare type MessageTable = any;
export declare enum LogLevel {
    CRITICAL = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
    FINER = 4,
    TRACE = 5
}
export declare class ComponentLogger implements ZLUX.ComponentLogger {
    private parentLogger;
    private componentName;
    private _messages;
    private _subLoggers;
    SEVERE: number;
    CRITICAL: number;
    WARN: number;
    WARNING: number;
    INFO: number;
    FINE: number;
    DEBUG: number;
    FINER: number;
    FINEST: number;
    TRACE: number;
    constructor(parentLogger: Logger, componentName: string, messages?: MessageTable);
    _setMessages(table: MessageTable): void;
    makeSublogger(componentNameSuffix: string): ComponentLogger;
    log(minimumLevel: number, ...loggableItems: any[]): void;
    severe(...loggableItems: any[]): void;
    critical(...loggableItems: any[]): void;
    info(...loggableItems: any[]): void;
    warn(...loggableItems: any[]): void;
    debug(...loggableItems: any[]): void;
    trace(...loggableItems: any[]): void;
}
export declare class Logger implements ZLUX.Logger {
    private destinations;
    private configuration;
    private previousPatterns;
    private knownComponentNames;
    static SEVERE: number;
    static CRITICAL: number;
    static WARNING: number;
    static WARN: number;
    static INFO: number;
    static DEBUG: number;
    static FINE: number;
    static FINER: number;
    static FINEST: number;
    static TRACE: number;
    private static processString;
    private static processStringPrefix;
    private static username;
    private static euid?;
    private static os?;
    private static offsetMs;
    private static seperator;
    private static useV8Tracing;
    constructor(offsetMs?: number);
    private updateProcessString;
    toggleV8Tracing(): boolean;
    _setBrowserUsername(username: string): void;
    addDestination(destinationCallback: (componentName: string, minimumLevel: LogLevel, ...loggableItems: any[]) => void): void;
    private shouldLogInternal;
    private static createPrependingStrings;
    private consoleLogInternal;
    makeDefaultDestination(prependDate?: boolean, prependName?: boolean, prependLevel?: boolean, prependProcess?: boolean, prependUser?: boolean, processStringPrefix?: string): (x: string, y: LogLevel, z: string) => void;
    log(componentName: string, minimumLevel: LogLevel, ...loggableItems: any[]): void;
    setLogLevelForComponentPattern(componentNamePattern: string, level: LogLevel): void;
    setLogLevelForComponentName(componentName: string, level: LogLevel | number): void;
    getComponentLevel(componentName: string): LogLevel;
    getConfig(): any;
    private noteComponentNameInternal;
    private replayPatternsOnLogger;
    makeComponentLogger(componentName: string, _messages?: MessageTable): ComponentLogger;
}
export {};
