/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { BaseLogger } from 'virtual-desktop-logger';

export interface StartMenuFolderItem {
  type: 'app' | 'link';
  /** Plugin identifier (for type 'app') */
  id?: string;
  /** Display title override */
  title?: string;
  /** URL to open (for type 'link') */
  dest?: string;
  /** App2app launch metadata (for type 'app') */
  app2app?: any;
}

export interface StartMenuFolder {
  name: string;
  items: StartMenuFolderItem[];
  /** Source plugin that shipped this folder */
  pluginIdentifier?: string;
  pluginVersion?: string;
}

const DESKTOP_PLUGIN = ZoweZLUX.pluginManager.getDesktopPlugin();

@Injectable({
  providedIn: 'root'
})
export class StartMenuFoldersService {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  readonly shippedFolders$ = new BehaviorSubject<StartMenuFolder[]>([]);

  constructor(private http: HttpClient) {}

  loadShippedFolders(): void {
    // Read the listing of all shipped folder files under ui/startMenu/folders
    // Use 'instance' scope since these are server-wide, not user-specific
    const listingUri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(DESKTOP_PLUGIN, 'instance', 'ui/startMenu/folders', undefined) + '?listing=true';
    this.http.get<any>(listingUri, { observe: 'response' }).subscribe(res => {
      if (res.status === 204 || !res.body) {
        this.shippedFolders$.next([]);
        return;
      }
      // The listing response returns contents as an array of filenames (e.g. ["com.rs.file-manager.json"])
      const contents = res.body?.contents;
      if (Array.isArray(contents) && contents.length > 0) {
        const allFolders: StartMenuFolder[] = [];
        let remaining = contents.length;
        contents.forEach((filename: string) => {
          // Pass the full filename (including .json) as the resource name
          const uri = ZoweZLUX.uriBroker.pluginConfigForScopeUri(DESKTOP_PLUGIN, 'instance', 'ui/startMenu/folders', filename);
          this.http.get<any>(uri, { observe: 'response' }).subscribe(folderRes => {
            if (folderRes.status !== 204 && folderRes.body?.contents) {
              const data = folderRes.body.contents;
              if (data.folders && Array.isArray(data.folders)) {
                data.folders.forEach((f: any) => {
                  allFolders.push({
                    name: f.name || filename,
                    items: Array.isArray(f.items) ? f.items : [],
                    pluginIdentifier: data.pluginIdentifier,
                    pluginVersion: data.pluginVersion
                  });
                });
              }
            }
            remaining--;
            if (remaining <= 0) {
              this.shippedFolders$.next(allFolders);
            }
          }, (err) => {
            remaining--;
            if (remaining <= 0) {
              this.shippedFolders$.next(allFolders);
            }
          });
        });
      } else {
        this.shippedFolders$.next([]);
      }
    }, () => {
      this.logger.warn('Could not load shipped start menu folders');
      this.shippedFolders$.next([]);
    });
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
