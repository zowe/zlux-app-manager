export declare class ZoweNotification {
    private message;
    private date;
    private type;
    private plugin;
    private title;
    private styleClass?;
    constructor(title: string, message: string, type: MVDHosting.ZoweNotificationType, plugin: string, styleClass?: string);
    getTitle(): string;
    getMessage(): string;
    getTime(): Date;
    getType(): MVDHosting.ZoweNotificationType;
    getPlugin(): string;
    getStyleClass(): string;
}
