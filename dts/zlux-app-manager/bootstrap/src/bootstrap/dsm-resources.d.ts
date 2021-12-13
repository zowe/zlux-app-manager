import { PluginManager } from 'zlux-base/plugin-manager/plugin-manager';
import { Dispatcher } from 'zlux-base/dispatcher/dispatcher';
import { Environment } from 'zlux-base/environment/environment';
import { Logger } from '../../../../zlux-shared/src/logging/logger';
import { ZoweNotificationManager } from 'zlux-base/notification-manager/notification-manager';
export declare var bootstrapLogger: ZLUX.ComponentLogger;
export declare class DSMResources {
    static pluginManager: typeof PluginManager;
    static environment: Environment;
    static uriBroker: ZLUX.UriBroker;
    static dispatcher: Dispatcher;
    static logger: Logger;
    static registry: ZLUX.Registry;
    static notificationManager: ZoweNotificationManager;
    static globalization: ZLUX.Globalization;
}
