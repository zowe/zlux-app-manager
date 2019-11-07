

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { ViewContainerRef } from '@angular/core';
import { Subject } from 'rxjs/Subject';

export type InstanceId = any;
export type ViewportId = any;

export type EmbeddedInstance = {
  instanceId: InstanceId;
  viewportId: ViewportId;
}

export const Angular2InjectionTokens = {
  /* Module level resources */
  LOGGER: 'virtualdesktop-ng2.0-0-0.logger',
  PLUGIN_DEFINITION: 'virtualdesktop-ng2.0-0-0.plugin-definition',
  LAUNCH_METADATA: 'virtualdesktop-ng2.0-0-0.launch-metadata',
  L10N_CONFIG: 'virtualdesktop-ng2.0-0-0.l10n-config',

  /* Component Level Resources */
  PLUGIN_EMBED_ACTIONS: 'virtualdesktop-ng2.0-0-0.plugin-embed-actions',
  VIEWPORT_EVENTS: 'virtualdesktop-ng2.0-0-0.viewport-events',

  /* Window manager unique */
  MAIN_WINDOW_ID: 'virtualdesktop-ng2.0-0-0.window-id', /* optional */
  WINDOW_ACTIONS: 'virtualdesktop-ng2.0-0-0.window-actions', /* optional */
  WINDOW_EVENTS: 'virtualdesktop-ng2.0-0-0.window-events', /* optional */
};

export interface Angular2PluginWindowActions {
  readonly close: () => void;
  readonly minimize: () => void;
  readonly maximize: () => void;
  readonly restore: () => void;
  readonly setTitle: (title: string) => void;
  readonly setPosition: (pos: {top: number, left: number, width: number, height: number}) => void;
  readonly spawnContextMenu: (xPos: number, yPos: number, items: ContextMenuItem[], isAbsolutePos?: boolean) => boolean;
  readonly registerCloseHandler: (handler: () => Promise<void>) => void;
}

export interface Angular2PluginWindowEvents {
  readonly maximized: Subject<void>;
  readonly minimized: Subject<void>;
  readonly restored: Subject<void>;
  readonly moved: Subject<{top: number, left: number}>;
  readonly resized: Subject<{width: number, height: number}>;
  readonly titleChanged: Subject<string>;
}

export interface Angular2PluginViewportEvents {
  readonly resized: Subject<{width: number, height: number}>;
  readonly spawnContextMenu: (xPos: number, yPos: number, items: ContextMenuItem[]) => boolean;
  readonly registerCloseHandler: (handler: () => Promise<any>) => void;
}

export interface Angular2PluginEmbedActions {
  readonly createEmbeddedInstance: (identifier: string, launchMetadata: any, viewContainer: ViewContainerRef) => Promise<EmbeddedInstance>;
}

export interface ContextMenuItem {
  text: string;
  action: () => void;
  children?: ContextMenuItem[];
}

export interface Angular2L10nConfig {
  readonly defaultLocale: { languageCode: string; countryCode?: string; };
  readonly providers: any[];
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

