

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import {
  Input,
  Component,
  EventEmitter,
  Output,
  HostListener,
  ElementRef,
  ViewChild,
  ViewChildren,
  AfterViewInit,
  OnInit,
  OnDestroy,
  QueryList
} from '@angular/core';

import { ContextMenuItem } from 'pluginlib/inject-resources';

@Component({
  selector: 'com-rs-mvd-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.css'],
})
export class ContextMenuComponent implements AfterViewInit, OnInit, OnDestroy {
  hovering: ContextMenuItem;
  newX: number;
  newY: number;
  menuHeight: number;
  menuWidth: number;
  _parentWidth: number;
  activeIndex: number; // Index of active item in menu. -1 if none active.
  _isChildMenu: boolean; // True if menu is child of another menu, false otherwise.
  _isParentActive: boolean; // True if parent item is active (ie. menu should be displayed), false otherwise.
  isNavigable: boolean; // True if menu is navigable, false otherwise.
  _propagateChildLeft: boolean;
  _propagateChildUp: boolean;
  _parentText: string; // Text of parent menu item
  children: { [key: string]: any };

  @ViewChild('contextmenu')
  set menu(contextmenu: any) {
    contextmenu.nativeElement.style.opacity = 0;
    setTimeout(() => {
      let menuHeight = contextmenu.nativeElement.clientHeight;
      let menuWidth = contextmenu.nativeElement.clientWidth;
      if (!this._isChildMenu) {
        this.newY = this.validateY(this.newY, menuHeight);
        this.newX = this.validateX(this.newX, menuWidth);
        if (!this._propagateChildLeft) {
          this.newX = this.newX + 3;
        }
      }
      contextmenu.nativeElement.style.opacity = 1;
      this.menuHeight = menuHeight;
      this.menuWidth = menuWidth;
      this.activeIndex = -1; // By default, no item is selected.
      this._isParentActive = false; // Since by default no item is selected, all parent items are inactive.
      this.isNavigable = !this._isChildMenu; // By default, surface-depth menu is navigable, and all others are not.
    }, 0);
  }

  @ViewChildren(ContextMenuComponent) _children: QueryList<ContextMenuComponent>;

  @Input() set xPos(xPos: number) {
    this.newX = xPos + 2;
  };

  @Input() set yPos(yPos: number) {
    this.newY = yPos + 4;
  };
  
  @Input() menuItems: ContextMenuItem[];
  
  // Declare value of _isChildMenu based on input isChildMenu
  // This is set on every child menu
  @Input() set isChildMenu(isChildMenu: boolean) {
    this._isChildMenu = isChildMenu;
  };
  
  // Set values of _isParentActive and activeIndex based on input isParentActive
  // _isParentActive set to true by parent menu if activeIndex of parent menu corresponds to this child menu
  // activeIndex set to existing value of activeIndex if parent is active (ie. child menu visible), -1 otherwise, so that any active item in child menu reset when child meny disappears, thus none selected when it reappears.
  @Input() set isParentActive(isParentActive: boolean) {
    this._isParentActive = isParentActive; // Set _isParentActive based on input
    this.activeIndex = isParentActive ? this.activeIndex : -1; // If parent not active, reset this.activeIndex to -1
  };
  
  // Set value of isNavigable based on input parentNavigable.
  // If parent menu is navigable, child menu cannot be.
  @Input() set parentNavigable(parentNavigable: boolean) {
    if (parentNavigable) {
      this.isNavigable = false;
    }
  };
  
  @Input() set parentText(parentText: string) {
    this._parentText = parentText;
  };
  
  @Input() set parentWidth(parentWidth: number) {
    this._parentWidth = parentWidth;
  };

  // If parent propagated child left, child should also propagate its child left.
  @Input() set propagateChildLeft(propagateChildLeft: boolean) {
    this._propagateChildLeft = propagateChildLeft;
  }
  
  @Input() set propagateChildUp(propagateChildUp: boolean) {
    this._propagateChildUp = propagateChildUp;
  }



  @Output() complete: EventEmitter<void>;

  @Output() makeParentUnnavigable = new EventEmitter();
  
  @Output() makeParentNavigable = new EventEmitter();

  @Output() sendRefToParent = new EventEmitter();

  constructor(
    private elementRef: ElementRef
    ) {
    this.complete = new EventEmitter<void>();
  }

  // Make menu navigable, and emit makeParentUnnavigable event.
  // Emitting makeParentUnnavigable event will trigger any parent menu to call makeUnnavigable().
  makeNavigable = () => {
    // Make navigable
    this.isNavigable = true;
    // If menu has parent, un-focus parent
    if (this._isChildMenu) {
      this.makeParentUnnavigable.emit()
    }
  }

  // Make menu unnavigable, and emit makeParentUnnavigable event.
  // Emitting makeParentUnnavigable event will recursively make all subsequent parent menus call makeUnnavigable().
  makeUnnavigable() {
    // Make un-navigable
    this.isNavigable = false;
    // If menu has parent, un-focus parent
    if (this._isChildMenu) {
      this.makeParentUnnavigable.emit()
    }
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }
  
  ngAfterViewInit() {
    this.elementRef.nativeElement.focus()
    this.children = this._children.toArray().reduce((acc, curr) => (
      {
        ...acc,
        [curr._parentText]: curr
      }
    ), {})
  }
    
  validateX(xPos: number, menuWidth: number): number {
    let menuLeft = xPos;
    let menuRight = xPos + menuWidth;
    let screenWidth = window.innerWidth - 10; /* Gave a 10 pixel buffer so isn't right on the edge */
    if (menuRight > screenWidth) {
      this._propagateChildLeft = true;
      let overshoot = menuLeft - screenWidth;
      xPos = xPos - (menuWidth + (overshoot > 0 ? overshoot : 0))
    }
    if (menuLeft < 10) {
      let difference = 10 - menuLeft;
      xPos = xPos + difference;
    }
    return xPos;
  }

  validateY(yPos: number, menuHeight: number): number {
    let menuTop = yPos;
    let menuBottom = yPos + menuHeight;
    let screenHeight = window.innerHeight - 10; /* Gave a 10 pixel buffer so isn't right on the edge */
    if (menuBottom > screenHeight) {
      this._propagateChildUp = true;
      let overshoot = menuTop - screenHeight;
      yPos = yPos - (menuHeight + (overshoot > 0 ? overshoot : 0));
    }
    if (menuTop < 10) {
      let difference = 10 - menuTop;
      yPos = yPos + difference;
    }
    return yPos;
  }

  itemClicked(menuItem: ContextMenuItem): void {
    if (menuItem.action && !menuItem.disabled) {
      menuItem.action(this.closeContextMenu);
    }
  }

  closeContextMenu = (): void => {
    this.complete.emit();
  }

  setActiveIndex = (index: number) => {
    this.activeIndex = index;
  }

  @HostListener('document:mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if (event && !this.elementRef.nativeElement.contains(event.target) && !this._isChildMenu) {
      this.closeContextMenu();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.closeContextMenu();
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeyDown(event: KeyboardEvent) {
    let mod = (x: number, n: number): number => ((x == -2 ? -1 : x % n) + n) % n;
    let hasChildren;
    if (this.activeIndex > -1) {
      hasChildren = this.menuItems && this.menuItems[this.activeIndex].children ? true : false;
    }
    if (this.isNavigable) {
      let newIndex;
      switch (event.key){
        case 'ArrowUp':
          newIndex = mod(this.activeIndex - 1, this.menuItems.length)
          while (this.menuItems[newIndex].disabled) {
            newIndex = mod(newIndex - 1, this.menuItems.length)
          }
          this.activeIndex = newIndex;
          break;
        case 'ArrowDown':
          newIndex = mod(this.activeIndex + 1, this.menuItems.length)
          while (this.menuItems[newIndex].disabled) {
            newIndex = mod(newIndex + 1, this.menuItems.length)
          }
          this.activeIndex = newIndex;
          break;
        case 'ArrowRight':
          if (this._propagateChildLeft) {
            if (this.isNavigable) {
              this.makeParentNavigable.emit();
              this.setActiveIndex(-1);
            }
          } else {
            if (hasChildren) {
              this.makeUnnavigable(); // Make un-navigable because navigability will transfer to child menu
              setTimeout(() => {
                this.children[this.menuItems[this.activeIndex].text].makeNavigable();
                this.children[this.menuItems[this.activeIndex].text].setActiveIndex(0);
              }, 0)
            }
          }
          break;
        case 'ArrowLeft':
          if (this._propagateChildLeft) {
            if (hasChildren) {
              this.makeUnnavigable(); // Make un-navigable because navigability will transfer to child menu
              setTimeout(() => {
                this.children[this.menuItems[this.activeIndex].text].makeNavigable();
                this.children[this.menuItems[this.activeIndex].text].setActiveIndex(0);
              }, 0)
            }
          } else {
            if (this.isNavigable) {
              this.makeParentNavigable.emit();
              this.setActiveIndex(-1);
            }
          }
          break;
        case 'Enter':
          if (this.menuItems[this.activeIndex].action) {
            this.menuItems[this.activeIndex].action(this.closeContextMenu);
          }
      }
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

