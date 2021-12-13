import { ZoweNotification } from './notification';
export declare class ZoweNotificationManager implements MVDHosting.ZoweNotificationManagerInterface {
    notificationCache: any[];
    private handlers;
    private restUrl;
    idCount: number;
    constructor();
    _setURL(wsUrl: string, restUrl: string): void;
    updateHandlers(message: any): void;
    notify(notification: ZoweNotification): number;
    serverNotify(message: any): any;
    dismissNotification(id: number): void;
    removeAll(): void;
    getCount(): number;
    addMessageHandler(object: MVDHosting.ZoweNotificationWatcher): void;
    removeMessageHandler(object: MVDHosting.ZoweNotificationWatcher): void;
    createNotification(title: string, message: string, type: MVDHosting.ZoweNotificationType, plugin: string): ZoweNotification;
}
