

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Input, Component, EventEmitter, Output, HostListener, ElementRef } from '@angular/core';

import { ContextMenuItem } from 'pluginlib/inject-resources';

@Component({
  selector: 'com-rs-mvd-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.css']
})
export class ContextMenuComponent {
  hovering: ContextMenuItem;

  @Input() xPos: number;
  @Input() yPos: number;
  @Input() menuItems: ContextMenuItem[];

  @Output() complete: EventEmitter<void>;

  constructor(
    private elementRef: ElementRef
  ) {
    this.complete = new EventEmitter<void>();
  }

  itemClicked(menuItem: ContextMenuItem): void {
    console.log(menuItem.text);
    if (menuItem.action) {
      menuItem.action();
    }

    this.closeContextMenu();
  }

  closeContextMenu(): void {
    this.complete.emit();
  }

  @HostListener('document:mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if (event && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeContextMenu();
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

