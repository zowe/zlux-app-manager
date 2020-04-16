/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Inject } from '@angular/core';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Bookmark, BookmarksResponse } from '../shared';
import { mapTo, catchError, map } from 'rxjs/operators';
import { ProxyService } from './proxy.service';

@Injectable()
export class BookmarksService {

  private bookmarksServiceURL: string;
  private readonly requestMetadata = {
    _objectType: 'org.zowe.zlux.ng2desktop.webbrowser.settings.bookmarks',
    _metaDataVersion: '1.0.0',
  }
  bookmarks: Bookmark[] = [];

  constructor(
    private http: HttpClient,
    private proxy: ProxyService,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION)
    private pluginDefinition: ZLUX.ContainerPluginDefinition,
    @Inject(Angular2InjectionTokens.LOGGER) public logger: ZLUX.ComponentLogger,
  ) {
    this.bookmarksServiceURL = ZoweZLUX.uriBroker.pluginConfigUri(this.pluginDefinition.getBasePlugin(), 'settings', 'bookmarks');
  }

  update(): void {
    this.http.get<BookmarksResponse>(this.bookmarksServiceURL).pipe(
      map(res => res.contents.bookmarks),
      catchError(_err => of([])),
    ).subscribe(bookmarks => this.bookmarks = bookmarks);
  }

  add(url: string): void {
    const bookmark: Bookmark = {
      url,
      title: this.getTitleForURL(url),
      proxy: this.proxy.isEnabled(),
    };
    this.bookmarks.push(bookmark);
    this.save().subscribe();
  }

  remove(url: string): void {
    this.bookmarks = this.bookmarks.filter(bookmark => bookmark.url !== url);
    this.save().subscribe();
  }

  findByURL(url: string): Bookmark | undefined {
    return this.bookmarks.find(bookmark => bookmark.url === url);
  }

  private save(): Observable<void> {
    const requestBody = {
      ...this.requestMetadata,
      bookmarks: this.bookmarks
    }
    return this.http.put(this.bookmarksServiceURL, requestBody).pipe(mapTo(undefined));
  }

  private getTitleForURL(url: string): string {
    if (url.startsWith('http://')) {
      return url.substr(('http://').length);
    }
    if (url.startsWith('https://')) {
      return url.substr(('https://').length);
    }
    return url;
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
