/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, ReplaySubject, of, throwError } from 'rxjs';
import { switchMap, map, catchError, shareReplay } from 'rxjs/operators';
import { BaseLogger } from 'virtual-desktop-logger';

declare var ZoweZLUX: any;

/**
 * Represents a single entry returned by the ZSS directory listing endpoint.
 * Fields match the JSON produced by ZSS httpserver.c makeJSONForDirectory().
 */
export interface UssEntry {
  name: string;
  path: string;
  directory: boolean;
  size: number;
  ccsid: number;
  createdAt: string;
  mode: number;
  owner?: string;
  group?: string;
}

/**
 * Low-level Angular service wrapping the ZSS unixFile REST API.
 *
 * All USS file operations in the desktop shortcuts feature go through this
 * abstraction rather than making raw HTTP calls. It handles:
 *   - Home directory resolution via userInfoUri()
 *   - Base64 encode/decode for file content
 *   - The two-step session-based write protocol
 *   - Rename with copy+delete fallback
 *
 * The service exposes a `ready$` observable that emits the resolved shortcuts
 * root path. All operations that require the root path should chain off ready$.
 */
@Injectable()
export class UssFileService {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;

  /**
   * Emits the resolved shortcuts root directory path once home directory
   * resolution completes. Replays the last value for late subscribers.
   */
  readonly ready$: Observable<string>;

  private readySubject = new ReplaySubject<string>(1);

  constructor(private http: HttpClient) {
    this.ready$ = this.readySubject.asObservable().pipe(shareReplay(1));
  }

  /**
   * Resolve the shortcuts root directory path.
   *
   * If `configuredDirectory` is provided (from zowe.yaml), it is used directly.
   * Otherwise, calls ZoweZLUX.uriBroker.userInfoUri() to discover the user's
   * home directory and constructs `<home>/.zowe/shortcuts/Desktop`.
   *
   * This must be called once during initialization. The result is emitted on
   * ready$ and cached for all subsequent operations.
   */
  resolveShortcutsRoot(configuredDirectory: string | null): void {
    if (configuredDirectory) {
      this.logger.info('Using configured shortcuts directory: ' + configuredDirectory);
      this.readySubject.next(configuredDirectory);
      this.readySubject.complete();
      return;
    }

    const uri = ZoweZLUX.uriBroker.userInfoUri();
    this.http.get<any>(uri).subscribe(
      (res: any) => {
        const home = (res.home || '').trim();
        if (!home) {
          this.logger.warn('userInfoUri() returned empty home directory');
          this.readySubject.error(new Error('Home directory unavailable'));
          return;
        }
        const root = home + '/.zowe/shortcuts/Desktop';
        this.logger.info('Resolved shortcuts directory: ' + root);
        this.readySubject.next(root);
        this.readySubject.complete();
      },
      (err: any) => {
        this.logger.warn('Failed to resolve home directory via userInfoUri(): ' + (err.message || err.status));
        this.readySubject.error(err);
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Directory operations
  // ---------------------------------------------------------------------------

  /**
   * List all entries in a USS directory, including dot-files.
   * Returns the raw entry array from ZSS `GET /unixfile/contents/{path}`.
   */
  listDir(path: string): Observable<UssEntry[]> {
    const url = ZoweZLUX.uriBroker.unixFileUri('contents', path);
    return this.http.get<any>(url).pipe(
      map((res: any) => (res.entries || []) as UssEntry[])
    );
  }

  /**
   * List visible (non-dot-file) entries in a USS directory.
   * Filters out any entry whose name starts with '.'.
   */
  listVisibleEntries(path: string): Observable<UssEntry[]> {
    return this.listDir(path).pipe(
      map(entries => entries.filter(e => !e.name.startsWith('.')))
    );
  }

  // ---------------------------------------------------------------------------
  // File read/write
  // ---------------------------------------------------------------------------

  /**
   * Read a USS file and return its content as a decoded UTF-8 string.
   * Uses `responseType=b64` to get base64-encoded content from ZSS,
   * then decodes client-side.
   */
  readFile(path: string): Observable<string> {
    const url = ZoweZLUX.uriBroker.unixFileUri('contents', path, { responseType: 'b64' });
    return this.http.get(url, { responseType: 'text' }).pipe(
      map((b64: string) => this.b64Decode(b64))
    );
  }

  /**
   * Write UTF-8 string content to a USS file using the ZSS two-step
   * session-based upload protocol.
   *
   * Step 1: PUT with sourceEncoding/targetEncoding/forceOverwrite, null body
   *         -> returns { sessionID }.
   * Step 2: PUT with sessionID/forceOverwrite/lastChunk, base64-encoded body
   *         -> writes content and closes session.
   *
   * Files are tagged UTF-8 (CCSID 1208) on z/OS to prevent EBCDIC
   * auto-conversion issues.
   */
  writeFile(path: string, content: string): Observable<void> {
    const initUrl = ZoweZLUX.uriBroker.unixFileUri('contents', path, {
      sourceEncoding: 'UTF-8',
      targetEncoding: 'UTF-8',
      forceOverwrite: true
    });

    return this.http.put<any>(initUrl, null).pipe(
      switchMap((initRes: any) => {
        const sessionID = initRes.sessionID;
        const dataUrl = ZoweZLUX.uriBroker.unixFileUri('contents', path, {
          sessionID: sessionID,
          forceOverwrite: true,
          lastChunk: true
        });
        const b64Content = this.b64Encode(content);
        return this.http.put(dataUrl, b64Content, { responseType: 'text' });
      }),
      map(() => void 0)
    );
  }

  // ---------------------------------------------------------------------------
  // Directory creation
  // ---------------------------------------------------------------------------

  /**
   * Create a directory. When `recursive` is true, intermediate directories
   * are created as needed (like `mkdir -p`).
   */
  mkdir(path: string, recursive: boolean = false): Observable<void> {
    const url = recursive
      ? ZoweZLUX.uriBroker.unixFileUri('mkdir', path, { recursive: true })
      : ZoweZLUX.uriBroker.unixFileUri('mkdir', path);
    return this.http.post(url, null).pipe(map(() => void 0));
  }

  // ---------------------------------------------------------------------------
  // Move / rename
  // ---------------------------------------------------------------------------

  /**
   * Move (rename) a file or directory from `src` to `dst`.
   * Uses `POST /unixfile/rename` with `newName` as a query parameter.
   *
   * If the rename fails (e.g. cross-filesystem), falls back to
   * copy + delete as a defensive measure.
   */
  move(src: string, dst: string, forceOverwrite: boolean = false): Observable<void> {
    const url = ZoweZLUX.uriBroker.unixFileUri(
      'rename', src, undefined, undefined, dst, forceOverwrite, undefined, true
    );
    return this.http.post(url, null).pipe(
      map(() => void 0),
      catchError((err: any) => {
        this.logger.warn('Rename failed (' + src + ' -> ' + dst + '), falling back to copy+delete: '
          + (err.message || err.status));
        return this.copyThenDelete(src, dst, forceOverwrite);
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  /**
   * Delete a file or directory.
   * Uses `DELETE /unixfile/contents/{path}`.
   */
  delete(path: string): Observable<void> {
    const url = ZoweZLUX.uriBroker.unixFileUri('contents', path);
    return this.http.delete(url).pipe(map(() => void 0));
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Check if a file or directory exists by attempting a metadata GET.
   * Returns true if status is 200, false on 404, and rethrows other errors.
   */
  exists(path: string): Observable<boolean> {
    const url = ZoweZLUX.uriBroker.unixFileUri('contents', path);
    return this.http.get<any>(url).pipe(
      map(() => true),
      catchError((err: any) => {
        if (err.status === 404) {
          return of(false);
        }
        return throwError(() => err);
      })
    );
  }

  /**
   * Fallback for move(): copy then delete.
   * Used when POSIX rename() fails (e.g. cross-filesystem).
   */
  private copyThenDelete(src: string, dst: string, forceOverwrite: boolean): Observable<void> {
    const copyUrl = ZoweZLUX.uriBroker.unixFileUri(
      'copy', src, undefined, undefined, dst, forceOverwrite, undefined, true
    );
    return this.http.post(copyUrl, null).pipe(
      switchMap(() => this.delete(src))
    );
  }

  /**
   * Decode a base64 string to UTF-8.
   * Uses browser-native atob() + TextDecoder for proper multi-byte handling.
   */
  private b64Decode(b64: string): string {
    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  }

  /**
   * Encode a UTF-8 string to base64.
   * Uses TextEncoder + btoa() for proper multi-byte handling.
   */
  private b64Encode(content: string): string {
    const bytes = new TextEncoder().encode(content);
    let binaryStr = '';
    for (let i = 0; i < bytes.length; i++) {
      binaryStr += String.fromCharCode(bytes[i]);
    }
    return btoa(binaryStr);
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
