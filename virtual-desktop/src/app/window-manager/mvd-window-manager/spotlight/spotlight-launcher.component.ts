/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { SpotlightSearchService, SpotlightResult, SpotlightResultCategory } from './spotlight-search.service';

interface CategoryGroup {
  category: SpotlightResultCategory;
  results: SpotlightResult[];
  icon: string;
}

const CATEGORY_ICONS: Record<SpotlightResultCategory, string> = {
  'Installed App': 'fa fa-th',
  'z/OS Job': 'fa fa-cogs',
  'Dataset': 'fa fa-database',
  'USS File': 'fa fa-file-o',
  'TSO Command': 'fa fa-terminal',
  'APIML Service': 'fa fa-cloud'
};

// Order in which categories appear
const CATEGORY_ORDER: SpotlightResultCategory[] = [
  'Installed App',
  'z/OS Job',
  'Dataset',
  'USS File',
  'TSO Command',
  'APIML Service'
];

@Component({
  selector: 'rs-com-spotlight-launcher',
  templateUrl: './spotlight-launcher.component.html',
  styleUrls: ['./spotlight-launcher.component.css']
})
export class SpotlightLauncherComponent implements OnInit, OnDestroy {
  @Output() closed = new EventEmitter<void>();

  @ViewChild('searchInput') searchInputRef: ElementRef;

  query: string = '';
  groups: CategoryGroup[] = [];
  flatResults: SpotlightResult[] = [];
  activeIndex: number = 0;
  isLoading: boolean = false;
  hasSearched: boolean = false;

  private searchSubject = new Subject<string>();
  private searchSub: Subscription;

  constructor(
    private searchService: SpotlightSearchService,
    private elRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.searchService.loadPlugins();
    this.searchSub = this.searchSubject.pipe(
      debounceTime(250),
      switchMap(q => {
        this.isLoading = true;
        return this.searchService.search(q);
      })
    ).subscribe(results => {
      this.isLoading = false;
      this.hasSearched = true;
      this.buildGroups(results);
    });

    // Focus the search input on next tick
    setTimeout(() => this.focusInput(), 0);
  }

  ngOnDestroy(): void {
    if (this.searchSub) {
      this.searchSub.unsubscribe();
    }
  }

  onInputChange(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
    this.onQueryChange();
  }

  onQueryChange(): void {
    this.activeIndex = 0;
    if (this.query.trim().length === 0) {
      this.groups = [];
      this.flatResults = [];
      this.hasSearched = false;
      this.isLoading = false;
      return;
    }
    this.searchSubject.next(this.query);
  }

  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (this.flatResults.length > 0) {
          this.activeIndex = (this.activeIndex + 1) % this.flatResults.length;
          this.updateInputFromSelection();
          this.scrollActiveIntoView();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (this.flatResults.length > 0) {
          this.activeIndex = (this.activeIndex - 1 + this.flatResults.length) % this.flatResults.length;
          this.updateInputFromSelection();
          this.scrollActiveIntoView();
        }
        break;
      case 'ArrowRight':
        if (this.flatResults.length > 0 && this.activeIndex < this.flatResults.length) {
          const result = this.flatResults[this.activeIndex];
          this.autocompleteFromResult(result);
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (this.flatResults.length > 0 && this.activeIndex < this.flatResults.length) {
          this.selectResult(this.flatResults[this.activeIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.dismiss();
        break;
    }
  }

  selectResult(result: SpotlightResult): void {
    result.action();
    this.dismiss();
  }

  dismiss(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    // Close if clicking outside the spotlight panel
    const panel = this.elRef.nativeElement.querySelector('.spotlight-panel');
    if (panel && !panel.contains(event.target)) {
      this.dismiss();
    }
  }

  getCategoryIcon(category: SpotlightResultCategory): string {
    return CATEGORY_ICONS[category] || 'fa fa-search';
  }

  getCategoryIconClass(category: SpotlightResultCategory): Record<string, boolean> {
    const icon = CATEGORY_ICONS[category] || 'fa fa-search';
    const classes: Record<string, boolean> = {};
    icon.split(' ').forEach(c => classes[c] = true);
    return classes;
  }

  isActive(result: SpotlightResult): boolean {
    return this.flatResults.indexOf(result) === this.activeIndex;
  }

  getResultIndex(result: SpotlightResult): number {
    return this.flatResults.indexOf(result);
  }

  private buildGroups(results: SpotlightResult[]): void {
    const map = new Map<SpotlightResultCategory, SpotlightResult[]>();
    results.forEach(r => {
      if (!map.has(r.category)) {
        map.set(r.category, []);
      }
      map.get(r.category)!.push(r);
    });

    this.groups = CATEGORY_ORDER
      .filter(cat => map.has(cat))
      .map(cat => ({
        category: cat,
        results: map.get(cat)!,
        icon: CATEGORY_ICONS[cat]
      }));

    // Build flat list for keyboard nav
    this.flatResults = [];
    this.groups.forEach(g => this.flatResults.push(...g.results));

    if (this.activeIndex >= this.flatResults.length) {
      this.activeIndex = Math.max(0, this.flatResults.length - 1);
    }
  }

  private focusInput(): void {
    if (this.searchInputRef?.nativeElement) {
      this.searchInputRef.nativeElement.focus();
    }
  }

  private scrollActiveIntoView(): void {
    setTimeout(() => {
      const el = this.elRef.nativeElement.querySelector('.spotlight-result-item.active');
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 0);
  }

  private updateInputFromSelection(): void {
    if (this.activeIndex < this.flatResults.length) {
      const result = this.flatResults[this.activeIndex];
      // For path-like results, show the full path; otherwise the label
      this.query = this.getAutocompleteValue(result);
      this.syncInputValue();
    }
  }

  private autocompleteFromResult(result: SpotlightResult): void {
    const value = this.getAutocompleteValue(result);
    if (value !== this.query) {
      this.query = value;
      this.syncInputValue();
      this.searchSubject.next(this.query);
    }
  }

  private getAutocompleteValue(result: SpotlightResult): string {
    // For USS files, use the full path from the description
    if (result.category === 'USS File' && result.description) {
      const fullPath = result.description.split(' | ')[0];
      if (fullPath && fullPath.startsWith('/')) {
        return fullPath;
      }
    }
    // For datasets, use the dataset name directly
    if (result.category === 'Dataset') {
      return result.label;
    }
    return result.label;
  }

  private syncInputValue(): void {
    if (this.searchInputRef?.nativeElement) {
      this.searchInputRef.nativeElement.value = this.query;
    }
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
