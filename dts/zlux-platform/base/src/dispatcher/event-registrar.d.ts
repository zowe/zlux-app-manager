export declare class EventRegistrar {
    private eventsList;
    private DEFAULT_UNIQUE_ID_LENGTH;
    private chars;
    private charsLength;
    createFullEventId(eventType: string, instanceId: string, length: number): string;
    findIndexOfEvent(eventType: string, appInstanceId: string, eventNameList: Array<string>): number | null;
    registerEvent(eventType: string, pluginId: string, appInstanceId: string): void;
    deregisterEvent(eventType: string, pluginId: string, appInstanceId: string): void;
    findEventCodes(eventType: string, pluginId: string | null, appInstanceId: string | null): string[];
}
