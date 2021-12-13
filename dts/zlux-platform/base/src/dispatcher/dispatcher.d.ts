export declare class RecognizerIndex {
    propertyName: string;
    valueMap: Map<any, RecognitionRule[]>;
    constructor(propertyName: string);
    extend(propertyValue: any, rule: RecognitionRule): void;
}
export declare class ApplicationInstanceWrapper {
    applicationInstanceId: any;
    isIframe: boolean;
    callbacks?: any;
    constructor(applicationInstanceId: any, isIframe: boolean, callbacks?: any);
}
export declare class DispatcherConstants implements ZLUX.DispatcherConstants {
    readonly ActionTargetMode: typeof ActionTargetMode;
    readonly ActionType: typeof ActionType;
}
export declare class Dispatcher implements ZLUX.Dispatcher {
    private pendingIframes;
    private instancesForTypes;
    private recognizers;
    private actionsByID;
    private indexedRecognizers;
    launchCallback: any;
    private pluginWatchers;
    postMessageCallback: any;
    readonly constants: DispatcherConstants;
    private log;
    private eventRegistry;
    private windowManager;
    constructor(logger: ZLUX.ComponentLogger);
    registerApplicationCallbacks(plugin: ZLUX.Plugin, applicationInstanceId: any, callbacks: ZLUX.ApplicationCallbacks): void;
    static dispatcherHeartbeatInterval: number;
    clear(): void;
    runHeartbeat(): void;
    iframeLoaded(instanceId: MVDHosting.InstanceId, identifier: string): void;
    deregisterPluginInstance(plugin: ZLUX.Plugin, applicationInstanceId: MVDHosting.InstanceId): void;
    registerPluginInstance(plugin: ZLUX.Plugin, applicationInstanceId: MVDHosting.InstanceId, isIframe: boolean, isEmbedded?: boolean): void;
    setLaunchHandler(launchCallback: any): void;
    setPostMessageHandler(postMessageCallback: any): void;
    matchInList(recognizersForIndex: any[], propertyValue: any, shouldCreate: boolean): any;
    private getRecognizersForCapabilities;
    private getAllRecognizersForCapabilities;
    /**
     * @deprecated Use getActions instead
     * @param applicationContext
     */
    getRecognizers(applicationContext: any): RecognitionRule[];
    getRecognizersInternal(recognizerSet: RecognitionRule[], applicationContext: any): RecognitionRule[];
    addRecognizerObject(recognizer: ZLUX.RecognizerObject): void;
    /**
     * @deprecated. replaced by addRecognizerObject
     * @param predicateObject
     * @param actionID
     * @param capabilities
     */
    addRecognizerFromObject(predicateObject: ZLUX.RecognitionObjectPropClause | ZLUX.RecognitionObjectOpClause, actionID: string, capabilities?: string[]): void;
    private addRecognizerFromObjectInner;
    addRecognizer(predicate: RecognitionClause, actionID: string, capabilities?: string[]): void;
    registerPluginWatcher(plugin: ZLUX.Plugin, watcher: ZLUX.PluginWatcher): void;
    deregisterPluginWatcher(plugin: ZLUX.Plugin, watcher: ZLUX.PluginWatcher): boolean;
    private isConcreteAction;
    registerAction(action: ZLUX.Action): void;
    registerAbstractAction(action: ZLUX.AbstractAction): void;
    /**
     * Legacy method.
     * @param recognizer
     * @returns the action referenced by recognizer.actionID if and only if it is a concrete ZLUX.Action, undefined otherwise
     * @deprecated. Use getAbstractActions instead.
     */
    getAction(recognizer: any): ZLUX.Action | undefined;
    getAbstractActionById(actionId: string): ZLUX.AbstractAction | undefined;
    getAbstractActions(capabilities: string[] | null, applicationContext: any): ZLUX.ActionLookupResult;
    /**
     * WARNING: recursively modifies the children references
     * @param actionContainer
     */
    private resolveActionReferences;
    static isAtomicType(specType: string): boolean;
    evaluateTemplateOp(operation: any, eventContext: any, localContext: any): any;
    isEmpty(obj: any): boolean;
    buildObjectFromTemplate(template: any, eventContext: any): any;
    makeActionFromObject(actionObject: ZLUX.AbstractAction): ZLUX.AbstractAction;
    makeAction(id: string, defaultName: string, targetMode: ActionTargetMode, type: ActionType, targetPluginID: string, primaryArgument: any, objectType?: string): ZLUX.Action;
    private getAppInstanceWrapper;
    addPendingIframe(plugin: ZLUX.Plugin, launchMetadata: any): void;
    private createAsync;
    private getActionTarget;
    invokeAction(action: Action, eventContext: any, targetId?: number): Promise<void>;
    launchApp: (evt: CustomEvent) => void;
    callInstance(eventName: string, appInstanceId: string, data: Object): Promise<unknown>;
    callAny(eventName: string, pluginId: string, data: Object): Promise<unknown>;
    callAll(eventName: string, pluginId: string, data: Object, failOnError?: boolean): Promise<unknown>;
    callEveryone(eventName: string, data: Object, failOnError?: boolean): Promise<unknown>;
    call(eventName: string, pluginId: string | null, appInstanceId: string | null, data: Object, singleEvent: boolean, failOnError: boolean): Promise<unknown>;
    allSettled(promises: Promise<any>[]): Promise<({
        state: string;
        value: any;
    } | {
        state: string;
        value: any;
    })[]>;
    findPluginIdFromInstanceId(instanceId: string): string | null;
    isIframe(instanceId: string): boolean;
    registerEventListener(eventName: string, callback: EventListenerOrEventListenerObject | null, appId: string): void;
    deregisterEventListener(eventName: string, callback: EventListenerOrEventListenerObject | null, appId: string, pluginId: string): void;
    postMessageCallbackWrapper: (fullEventName: string, eventPayload: any) => Promise<unknown>;
    iframeMessageHandler: (evt: any) => void;
    attachWindowManager(windowManager: any): boolean;
}
export declare class RecognitionRule {
    predicate: RecognitionClause;
    actionID: string;
    capabilities?: string[];
    originatingPluginID: string;
    constructor(predicate: RecognitionClause, actionID: string, capabilities?: string[]);
    static isReservedKey(key: string): boolean;
    isSourceIndexable(): boolean;
}
export declare enum RecognitionOp {
    AND = 0,
    OR = 1,
    NOT = 2,
    PROPERTY_EQ = 3,
    PROPERTY_NE = 4,
    PROPERTY_LT = 5,
    PROPERTY_GT = 6,
    PROPERTY_LE = 7,
    PROPERTY_GE = 8,
    SOURCE_PLUGIN_TYPE = 9,
    MIME_TYPE = 10
}
export declare class RecognitionClause {
    operation: RecognitionOp;
    subClauses: (RecognitionClause | number | string | string[])[];
    constructor(op: RecognitionOp);
    match(_applicationContext: any): boolean;
}
export declare class RecognizerAnd extends RecognitionClause {
    constructor(...conjuncts: (RecognitionClause)[]);
    match(applicationContext: any): boolean;
}
export declare class RecognizerOr extends RecognitionClause {
    constructor(...disjuncts: (RecognitionClause | number | string)[]);
    match(applicationContext: any): boolean;
}
export declare class RecognizerProperty extends RecognitionClause {
    constructor(...args: (RecognitionClause | number | string | string[])[]);
    match(applicationContext: any): boolean;
    private static getPropertyValue;
    private static getNestedPropertyValue;
    private static getDirectPropertyValue;
}
export declare enum ActionTargetMode {
    PluginCreate = 0,
    PluginFindUniqueOrCreate = 1,
    PluginFindAnyOrCreate = 2,
    System = 3
}
export declare enum ActionType {
    Launch = 0,
    Focus = 1,
    Route = 2,
    Message = 3,
    Method = 4,
    Minimize = 5,
    Maximize = 6,
    Close = 7
}
export declare class AbstractAction implements ZLUX.AbstractAction {
    id: string;
    i18nNameKey: string;
    defaultName: string;
    description: string;
    constructor(id: string, defaultName: string);
    getDefaultName(): string;
    getId(): string;
}
export declare class Action extends AbstractAction implements ZLUX.Action {
    targetMode: ActionTargetMode;
    type: ActionType;
    targetPluginID: string;
    primaryArgument?: any;
    constructor(id: string, defaultName: string, targetMode: ActionTargetMode, type: ActionType, targetPluginID: string, primaryArgument?: any);
}
export declare class ActionContainer extends AbstractAction implements ZLUX.ActionContainer {
    children: (ZLUX.AbstractAction | ZLUX.ActionReference)[];
    getChildren(): (ZLUX.AbstractAction | ZLUX.ActionReference)[];
}
