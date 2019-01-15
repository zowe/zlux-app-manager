

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Input, Component, EventEmitter, Output, HostListener, ElementRef, ViewChild } from '@angular/core';

import { ContextMenuItem } from 'pluginlib/inject-resources';

@Component({
  selector: 'com-rs-mvd-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.css']
})
export class ContextMenuComponent {
  hovering: ContextMenuItem;
  newX: number;
  newY: number;

  @ViewChild('contextmenu')
  set menu(contextmenu: any) {
    contextmenu.nativeElement.style.opacity = 0;
    setTimeout(() => { 
      let menuHeight = contextmenu.nativeElement.clientHeight;
      let menuWidth = contextmenu.nativeElement.clientWidth;
      this.newY = this.validateY(this.newY, menuHeight);
      this.newX = this.validateX(this.newX, menuWidth);
      contextmenu.nativeElement.style.opacity = 1;
    }, 0);
  }

  @Input() set xPos(xPos: number) {
    this.newX = xPos;
  };

  @Input() set yPos(yPos: number) {
    this.newY = yPos;
  };

  @Input() menuItems: ContextMenuItem[];

  @Output() complete: EventEmitter<void>;

  constructor(
    private elementRef: ElementRef
  ) {
    this.complete = new EventEmitter<void>();
  }

  validateX(xPos: number, menuWidth: number): number {
    let menuRight = xPos + menuWidth;
    let screenWidth = window.innerWidth - 10; /* Gave a 10 pixel buffer so isn't right on the edge */
    if (menuRight > screenWidth) {
      let difference = menuRight - screenWidth;
      xPos = xPos - difference
    }
    return xPos;
  }

  validateY(yPos: number, menuHeight: number): number {
    let menuBottom = menuHeight + yPos;
    let screenHeight = window.innerHeight - 10; /* Gave a 10 pixel buffer so isn't right on the edge */
    if (menuBottom > screenHeight) {
     let difference = menuBottom - screenHeight;
     yPos = yPos - difference;
    }
    return yPos;
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

