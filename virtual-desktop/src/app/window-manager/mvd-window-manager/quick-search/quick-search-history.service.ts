/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { QuickSearchResult, QuickSearchResultCategory } from './quick-search.service';
import { BaseLogger } from 'virtual-desktop-logger';

export type HistoryCategory = 'tso' | 'mvs';

/**
 * Manages quick search command history persistence via the Zowe config dataservice.
 * Self-contained -- no dependency on QuickSearchService.
 */
@Injectable()
export class QuickSearchHistoryService {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private readonly MAX_HISTORY = 20;
  private tsoHistory: string[] = [];
  private mvsHistory: string[] = [];
  private historySaveDebounce: any = null;

  constructor(private http: HttpClient) {}

  /** Load persisted history from the Zowe config dataservice. */
  loadHistory(): void {
    const uri = this.historyConfigUri();
    this.http.get<any>(uri).pipe(
      catchError(() => of(null))
    ).subscribe(resp => {
      const data = resp?.contents || resp;
      if (data) {
        if (Array.isArray(data.tso)) {
          this.tsoHistory = data.tso.slice(0, this.MAX_HISTORY);
        }
        if (Array.isArray(data.mvs)) {
          this.mvsHistory = data.mvs.slice(0, this.MAX_HISTORY);
        }
      }
      this.logger.debug('Quick search: command history loaded');
    });
  }

  /** Add a command to the front of the named history list. */
  addToHistory(category: HistoryCategory, cmd: string): void {
    const history = this.getHistoryArray(category);
    const idx = history.indexOf(cmd);
    if (idx !== -1) {
      history.splice(idx, 1);
    }
    history.unshift(cmd);
    if (history.length > this.MAX_HISTORY) {
      history.length = this.MAX_HISTORY;
    }
    this.scheduleSaveHistory();
  }

  /** Get the raw history strings for a category. */
  getHistory(category: HistoryCategory): string[] {
    return this.getHistoryArray(category);
  }

  /** Clear all history for a category. */
  clearHistory(category: HistoryCategory): void {
    this.getHistoryArray(category).length = 0;
    this.scheduleSaveHistory();
  }

  /** Remove a single item from a category's history. */
  removeHistoryItem(category: HistoryCategory, cmd: string): void {
    const history = this.getHistoryArray(category);
    const idx = history.indexOf(cmd);
    if (idx !== -1) {
      history.splice(idx, 1);
    }
    this.scheduleSaveHistory();
  }

  /**
   * Build QuickSearchResult[] for the history of a given category.
   * Used by providers to return history when a bare prefix is typed.
   */
  buildHistoryResults(category: string, prefix: string, historyCategory: HistoryCategory, providerId: string): QuickSearchResult[] {
    const history = this.getHistoryArray(historyCategory);
    const cat = category as QuickSearchResultCategory;
    return history.map(cmd => ({
      category: cat,
      label: prefix + ' ' + cmd,
      description: 'Recent command',
      historyItem: true,
      historyCommand: cmd,
      providerId: providerId,
      actionMetadata: { type: 'none' as const },
      action: () => {}
    }));
  }

  // ----------------------------------------------------------------
  // Private
  // ----------------------------------------------------------------

  private getHistoryArray(category: HistoryCategory): string[] {
    return category === 'tso' ? this.tsoHistory : this.mvsHistory;
  }

  private historyConfigUri(): string {
    return ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      ZoweZLUX.pluginManager.getDesktopPlugin(), 'user', 'quickSearch', 'history.json'
    );
  }

  private scheduleSaveHistory(): void {
    if (this.historySaveDebounce !== null) {
      clearTimeout(this.historySaveDebounce);
    }
    this.historySaveDebounce = setTimeout(() => {
      this.historySaveDebounce = null;
      this.saveHistory();
    }, 1000);
  }

  private saveHistory(): void {
    const uri = this.historyConfigUri();
    const payload = {
      _objectType: 'org.zowe.zlux.ng2desktop.quickSearch.history',
      _metaDataVersion: '1.0.0',
      tso: this.tsoHistory,
      mvs: this.mvsHistory
    };
    this.http.put(uri, payload).pipe(
      catchError(err => {
        this.logger.warn('Quick search: failed to save command history', err);
        return of(null);
      })
    ).subscribe(() => {
      this.logger.debug('Quick search: command history saved');
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
