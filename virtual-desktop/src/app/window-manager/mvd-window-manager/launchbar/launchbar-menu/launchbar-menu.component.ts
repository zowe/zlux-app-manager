

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
  HostListener,
  Input,
  Output,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { LaunchbarItem } from '../shared/launchbar-item';
import { LaunchbarMenuItemComponent } from '../launchbar-menu-item/launchbar-menu-item.component';
import { FocusKeyManager } from '@angular/cdk/a11y';

@Component({
  selector: 'rs-com-launchbar-menu',
  templateUrl: './launchbar-menu.component.html',
  styleUrls: ['./launchbar-menu.component.css'],
})
export class LaunchbarMenuComponent {
  @Input() menuItems: LaunchbarItem[];
  @Output() itemClicked: EventEmitter<LaunchbarItem> = new EventEmitter<LaunchbarItem>();
  @Output() menuStateChanged: EventEmitter<boolean> = new EventEmitter<boolean>();
  isActive: boolean = false;
  @ViewChildren(LaunchbarMenuItemComponent) items: QueryList<LaunchbarMenuItemComponent>;
  keyManager: FocusKeyManager<LaunchbarMenuItemComponent>;
  @ViewChild('popup') popupElementRef : ElementRef;

  constructor(private elementRef: ElementRef) {
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.keyManager = new FocusKeyManager(this.items).withWrap().withTypeAhead();
  }

  activeToggle(): void {
    if (this.isActive) {
    this.deactivateMenu();
  } else {
    this.activateMenu();
    }
  }

  activateMenu(): void {
    this.isActive = true;
    window.setTimeout(() => {
      this.keyManager.setFirstItemActive();
      this.emitState();
    }, 0);
  }

  deactivateMenu(): void {
    this.isActive = false;
    this.emitState();
  }

  clicked(item: LaunchbarItem): void {
    this.itemClicked.emit(item);
    this.isActive = false;
    this.emitState();
  }

  @HostListener('document:mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if (this.isActive && event && !this.elementRef.nativeElement.contains(event.target)) {
      this.isActive = false;
      this.emitState();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKeyDown(event: KeyboardEvent): void {
    // Ctrl + Space
    if (event.ctrlKey && event.keyCode === 32) {
      if (!this.isActive) {
        this.activateMenu();
        this.emitState();
      }
    }
  }

  private emitState(): void {
    this.menuStateChanged.emit(this.isActive);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.keyCode === 13 || event.keyCode === 32) {
      const menuItem = this.keyManager.activeItem as LaunchbarMenuItemComponent;
      this.clicked(menuItem.item);
    } else if (event.keyCode === 27) {
      this.deactivateMenu();
    } else {
      this.keyManager.onKeydown(event);
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

