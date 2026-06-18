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
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap, take } from 'rxjs/operators';
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
  'MVS Console': 'fa fa-desktop',
  'APIML Service': 'fa fa-cloud'
};

// Order in which categories appear
const CATEGORY_ORDER: SpotlightResultCategory[] = [
  'Installed App',
  'z/OS Job',
  'Dataset',
  'USS File',
  'TSO Command',
  'MVS Console',
  'APIML Service'
];

@Component({
  selector: 'rs-com-spotlight-launcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spotlight-launcher.component.html',
  styleUrls: ['./spotlight-launcher.component.css']
})
export class SpotlightLauncherComponent implements OnInit, OnDestroy, OnChanges {
  @Input() visible: boolean = false;
  @Output() closed = new EventEmitter<void>();

  @ViewChild('searchInput') searchInputRef: ElementRef;
  @ViewChild('spotlightPanel') panelRef: ElementRef;

  query: string = '';
  groups: CategoryGroup[] = [];
  flatResults: SpotlightResult[] = [];
  activeIndex: number = -1;
  isLoading: boolean = false;
  hasSearched: boolean = false;
  private originalQuery: string = '';

  // Drag state
  isDragging = false;
  panelX = 0;
  panelY = 0;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  // Resize state
  isResizing = false;
  panelW = 640;
  panelH = 0; // 0 = auto height
  maxAutoHeight = 600;
  private resizeStartX = 0;
  private resizeStartY = 0;
  private resizeStartW = 0;
  private resizeStartH = 0;
  private resizeCorner: 'br' | 'bl' = 'br';
  private resizeStartPanelX = 0;

  private boundOnMouseMove = this.onMouseMove.bind(this);
  private boundOnMouseUp = this.onMouseUp.bind(this);

  private searchSubject = new Subject<string>();
  private searchSub: Subscription;

  // Ghost text examples -- rotating hints for prefix commands
  ghostText: string = '';
  private readonly tsoExamples = [
    'LISTCAT -- list catalog entries',
    'STATUS -- display job status',
    'LISTDS dsname -- show data set attributes',
    'SUBMIT dsname -- submit a job for processing',
    'ALLOCATE DATASET(name) -- allocate a data set',
    'DELETE dsname -- delete a data set',
    'RENAME oldname newname -- rename a data set',
    'LISTALC -- list current allocations',
    'PROFILE -- display or set session defaults',
    'PRINTDS dsname -- print a data set',
    'FREE -- release data set allocations',
    'SEND \'msg\' USER(uid) -- send a message to a user',
    'EXEC dsname -- execute a CLIST or REXX exec',
    'CALL pgmname -- load and execute a program',
    'LISTBC -- list broadcast messages',
    'TIME -- display time and resource usage',
    'TRANSMIT node.user -- send data to another user',
    'RECEIVE -- receive transmitted data',
    'CANCEL jobname -- cancel a background job',
    'OUTPUT -- process SYSOUT data sets',
    'HELP cmdname -- get help on a TSO command',
    'RACDCERT LIST(label) ID(user) -- list a digital certificate',
    'RACDCERT LISTRING(ring) ID(user) -- list key ring contents',
    'RACDCERT LISTCHAIN(label) ID(user) -- list certificate chain',
    'RACDCERT CERTAUTH LIST -- list CA certificates',
    'RACDCERT CHECKCERT dsname -- check a certificate in a data set',
    'RACDCERT EXPORT(label) ID(user) -- export a certificate',
    'RACDCERT ADDRING(ring) ID(user) -- create a new key ring',
    'RACDCERT DELRING(ring) ID(user) -- delete a key ring',
    'RACDCERT GENCERT ... -- generate a certificate and key pair',
    'RACDCERT ADD(dsname) ID(user) -- add a certificate from data set',
    'RACDCERT DELETE(label) ID(user) -- delete a certificate',
    'RACDCERT CONNECT(... RING(ring) -- connect cert to key ring',
    'RACDCERT REMOVE(... RING(ring) -- remove cert from key ring',
    'RACDCERT GENREQ(label) ID(user) -- generate a certificate request',
    'RACDCERT REKEY(label) ID(user) -- rekey a certificate',
    'RACDCERT ROLLOVER(label) ID(user) -- roll over a rekeyed cert',
  ];
  private readonly mvsExamples = [
    'D A,L -- display active address spaces',
    'D IPLINFO -- display IPL information',
    'D M=CPU -- display processor status',
    'D ASM -- display auxiliary storage',
    'D T -- display time of day',
    'D R,L -- display pending replies',
    'D GRS,C -- display resource contention',
    'D PROG,LPA,MOD=name -- search LPA for a module',
    'D SMS,STORGRP(ALL) -- display SMS storage groups',
    'D ETR -- display external time reference status',
    'D PARMLIB -- display parmlib concatenation',
    'D SYMBOLS -- display static system symbols',
    'D OMVS,A=ALL -- display UNIX processes',
    'D OMVS,F -- display UNIX file systems',
    'D LOGGER,L -- display log stream resources',
    'D XCF,STR -- display coupling facility structures',
    'D WLM,APPLENV=* -- display WLM app environments',
    'D DIAG -- display diagnostic options',
    'D DUMP -- display SYS1.DUMP data sets',
    'D CONSOLES -- display console configuration',
    'V dev,ONLINE -- vary a device online',
    'V dev,OFFLINE -- vary a device offline',
    'S procname -- start a cataloged procedure',
    'P jobname -- stop a running job or STC',
    'C jobname -- cancel a job in execution',
    'F procname,cmd -- modify a started task',
    'RO *ALL,D A,L -- route command to all systems',
    'SE \'msg\',CN=consname -- send msg to a console',
    'SETOMVS RESET=(xx) -- change UNIX options',
    'SETPROG APF,ADD,... -- update APF authorized list',
    'MN JOBNAMES,T -- monitor job activity',
    'TRACE ST,ON -- activate system trace',
    'D PROD,STATE -- display registered products',
  ];
  private tsoExampleIdx = 0;
  private mvsExampleIdx = 0;

  constructor(
    private searchService: SpotlightSearchService,
    private elRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.searchService.loadPlugins();
    this.centerPanel();
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']) {
      if (changes['visible'].currentValue) {
        this.searchService.setVisible(true);
        // Restore cached TSO result if spotlight was reopened with no current results
        const cached = this.searchService.getLastTsoResult();
        if (cached && this.flatResults.length === 0) {
          this.query = '/tso ' + this.searchService.getLastTsoQuery();
          this.hasSearched = true;
          this.buildGroups(cached);
          this.searchService.clearLastTsoResult();
          setTimeout(() => this.syncInputValue(), 0);
        }
        setTimeout(() => this.focusInput(), 0);
      } else {
        this.searchService.setVisible(false);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.searchSub) {
      this.searchSub.unsubscribe();
    }
    document.removeEventListener('mousemove', this.boundOnMouseMove);
    document.removeEventListener('mouseup', this.boundOnMouseUp);
  }

  // ---------------------------------------------------------------
  // Drag
  // ---------------------------------------------------------------
  onDragStart(event: MouseEvent): void {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    // Allow drag from input area when query is empty (input is already focused)
    if (target.classList.contains('spotlight-input') && this.query.length > 0) return;
    if (target.closest('.spotlight-resize-handle')) return;
    // Don't drag from clickable result items (but allow from output results)
    const resultItem = target.closest('.spotlight-result-item') as HTMLElement;
    if (resultItem && !resultItem.querySelector('.spotlight-tso-output')) return;

    event.preventDefault();
    this.isDragging = true;
    this.dragOffsetX = event.clientX - this.panelX;
    this.dragOffsetY = event.clientY - this.panelY;
    document.addEventListener('mousemove', this.boundOnMouseMove);
    document.addEventListener('mouseup', this.boundOnMouseUp);
  }

  // ---------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------
  onResizeStart(event: MouseEvent, corner: 'br' | 'bl'): void {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.isResizing = true;
    this.resizeCorner = corner;
    this.resizeStartX = event.clientX;
    this.resizeStartY = event.clientY;
    this.resizeStartW = this.panelW;
    this.resizeStartPanelX = this.panelX;
    // Capture actual rendered height if auto
    const el = this.panelRef?.nativeElement;
    this.resizeStartH = el ? el.offsetHeight : 400;
    if (this.panelH === 0) {
      this.panelH = this.resizeStartH;
    }
    document.addEventListener('mousemove', this.boundOnMouseMove);
    document.addEventListener('mouseup', this.boundOnMouseUp);
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.panelX = event.clientX - this.dragOffsetX;
      this.panelY = event.clientY - this.dragOffsetY;
    } else if (this.isResizing) {
      const dx = event.clientX - this.resizeStartX;
      const dy = event.clientY - this.resizeStartY;
      this.panelH = Math.max(60, this.resizeStartH + dy);
      if (this.resizeCorner === 'br') {
        this.panelW = Math.max(320, this.resizeStartW + dx);
      } else {
        // Bottom-left: grow width leftward
        const newW = Math.max(320, this.resizeStartW - dx);
        this.panelX = this.resizeStartPanelX - (newW - this.resizeStartW);
        this.panelW = newW;
      }
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.isResizing = false;
    document.removeEventListener('mousemove', this.boundOnMouseMove);
    document.removeEventListener('mouseup', this.boundOnMouseUp);
  }

  private centerPanel(): void {
    this.panelW = Math.min(640, window.innerWidth * 0.9);
    this.panelX = Math.round((window.innerWidth - this.panelW) / 2);
    this.panelY = Math.round(window.innerHeight * 0.18);
    this.panelH = 0; // auto
    this.maxAutoHeight = window.innerHeight - this.panelY - 16;
  }

  onInputChange(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
    this.updateGhostText();
    this.onQueryChange();
  }

  onQueryChange(): void {
    this.activeIndex = -1;
    if (this.query.trim().length === 0) {
      this.groups = [];
      this.flatResults = [];
      this.hasSearched = false;
      this.isLoading = false;
      return;
    }
    this.searchSubject.next(this.query);
    this.originalQuery = this.query;
  }

  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (this.flatResults.length > 0) {
          if (this.activeIndex < this.flatResults.length - 1) {
            this.activeIndex++;
          } else {
            // Wrap to "no selection" -- restore original query
            this.activeIndex = -1;
          }
          this.updateInputFromSelection();
          this.scrollActiveIntoView();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (this.flatResults.length > 0) {
          if (this.activeIndex > 0) {
            this.activeIndex--;
          } else if (this.activeIndex === 0) {
            // Wrap to "no selection" -- restore original query
            this.activeIndex = -1;
          } else {
            // From no selection, go to last result
            this.activeIndex = this.flatResults.length - 1;
          }
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
        if (this.activeIndex >= 0 && this.activeIndex < this.flatResults.length) {
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
    if (result.pendingExecution) {
      const cmd = result.label.replace(/^(TSO|MVS)>\s*/, '');
      this.isLoading = true;
      const submit$ = result.category === 'MVS Console'
        ? this.searchService.submitConsoleCommand(cmd)
        : this.searchService.submitTsoCommand(cmd);
      submit$.pipe(take(1)).subscribe(results => {
        this.isLoading = false;
        this.buildGroups(results);
      });
      return;
    }
    // Command output results -- copy and stay open
    if (result.output) {
      result.action();
      return;
    }
    // History items (TSO/MVS with no output, no pendingExecution) -- fill input
    if (result.category === 'TSO Command' || result.category === 'MVS Console') {
      this.query = result.label;
      this.syncInputValue();
      this.updateGhostText();
      this.originalQuery = this.query;
      this.searchSubject.next(this.query);
      return;
    }
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
    return this.activeIndex >= 0 && this.flatResults.indexOf(result) === this.activeIndex;
  }

  getResultIndex(result: SpotlightResult): number {
    return this.flatResults.indexOf(result);
  }

  isHistoryGroup(group: CategoryGroup): boolean {
    return group.results.length > 0 && group.results[0].historyItem === true;
  }

  clearAllHistory(group: CategoryGroup): void {
    const cat = group.category === 'TSO Command' ? 'tso' : 'mvs';
    this.searchService.clearHistory(cat as 'tso' | 'mvs');
    // Re-trigger search to refresh results
    this.searchSubject.next(this.query);
  }

  removeHistoryItem(result: SpotlightResult): void {
    const cat = result.category === 'TSO Command' ? 'tso' : 'mvs';
    // Extract command from label (strip "/tso " or "/mvs " prefix)
    const cmd = result.label.replace(/^\/(tso|mvs)\s+/i, '');
    this.searchService.removeHistoryItem(cat as 'tso' | 'mvs', cmd);
    // Re-trigger search to refresh results
    this.searchSubject.next(this.query);
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

    // Auto-highlight pending TSO commands so Enter submits immediately
    if (this.flatResults.length === 1 && this.flatResults[0].pendingExecution) {
      this.activeIndex = 0;
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
    if (this.activeIndex < 0) {
      // Restore original typed query
      this.query = this.originalQuery;
      this.syncInputValue();
      this.updateGhostText();
      return;
    }
    if (this.activeIndex < this.flatResults.length) {
      const result = this.flatResults[this.activeIndex];
      // Don't overwrite input for TSO output or pending results
      if (result.output || result.pendingExecution) {
        return;
      }
      this.query = this.getAutocompleteValue(result);
      this.syncInputValue();
      this.updateGhostText();
    }
  }

  private autocompleteFromResult(result: SpotlightResult): void {
    const value = this.getAutocompleteValue(result);
    if (value !== this.query) {
      this.query = value;
      this.syncInputValue();
      this.updateGhostText();
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

  private updateGhostText(): void {
    const q = this.query.toLowerCase();
    if (q === '/tso ' || q === '/tso') {
      const example = this.tsoExamples[this.tsoExampleIdx % this.tsoExamples.length];
      this.ghostText = q === '/tso' ? ' ' + example : example;
      if (q === '/tso ') {
        this.tsoExampleIdx++;
      }
    } else if (q === '/mvs ' || q === '/mvs') {
      const example = this.mvsExamples[this.mvsExampleIdx % this.mvsExamples.length];
      this.ghostText = q === '/mvs' ? ' ' + example : example;
      if (q === '/mvs ') {
        this.mvsExampleIdx++;
      }
    } else {
      this.ghostText = '';
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
