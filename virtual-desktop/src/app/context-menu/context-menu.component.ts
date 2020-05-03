

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
  QueryList,
} from '@angular/core';

import { ContextMenuItem } from 'pluginlib/inject-resources';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'com-rs-mvd-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.css'],
})
export class ContextMenuComponent implements AfterViewInit {
  static ItemHeight:number;
  _itemHeight: number;
  hovering: ContextMenuItem;
  newX: number;
  newY: number;
  menuHeight: number;
  menuWidth: number;
  activeIndex: number; // Index of active item in menu. -1 if none active.
  _isChildMenu: boolean; // True if menu is child of another menu, false otherwise.
  _isParentActive: boolean; // True if parent item is active (ie. menu should be displayed), false otherwise.
  isNavigable: boolean; // True if menu is keyboard-navigable, false otherwise. Only one menu can be navigable at a time.
  _propagateChildLeft: boolean; // True if child menus will appear to the left of their parent.
  _parentText: string; // Text of parent menu item
  children: { [key: string]: any }; // Array of child elements

  @ViewChild('contextmenu')
  set menu(contextmenu: any) {
    contextmenu.nativeElement.style.opacity = 0;
    setTimeout(() => {
      let menuWidth = contextmenu.nativeElement.clientWidth;
      if (!ContextMenuComponent.ItemHeight) {
        ContextMenuComponent.ItemHeight = Math.floor(contextmenu.nativeElement.clientHeight / this.menuItems.length);
      }
      //hack for template
      this._itemHeight = ContextMenuComponent.ItemHeight;
      // Apply specific styling to parent menu, and to parent menu that will propagate children to the left.
      if (!this._isChildMenu) {
        this.newY = this.validateY(this.newY, contextmenu.nativeElement.clientHeight);
        this.newX = this.validateX(this.newX, menuWidth);
        if (!this._propagateChildLeft) {
          this.newX = this.newX + 3;
        }
      } else {
        this.newY = this.validateY(this.newY, (ContextMenuComponent.ItemHeight*this.menuItems.length), this.parentY);
      }
      contextmenu.nativeElement.style.opacity = 1;
      this.menuHeight = contextmenu.nativeElement.clientHeight;
      this.menuWidth = menuWidth;
      this.activeIndex = -1; // By default, no item is selected.
      this._isParentActive = false; // Since by default no item is selected, all parent items are inactive.
      this.isNavigable = !this._isChildMenu; // By default, surface-depth menu is navigable, and all others are not.
    }, 0);
  }

  @ViewChildren(ContextMenuComponent) _children: QueryList<ContextMenuComponent>;

  // Set initial horizontal position of menu
  @Input() set xPos(xPos: number) {
    this.newX = xPos + 2;
  };

  // Set initial vertical position of menu
  @Input() set yPos(yPos: number) {
    this.newY = yPos + 4;
  };

  // Set initial vertical position of menu
  @Input() parentY: number;
  
  // Initialize array of menu items
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
  
  // Set value of parentText based on input
  @Input() set parentText(parentText: string) {
    this._parentText = parentText;
  };

  // If parent propagated child left, child should also propagate its child left.
  @Input() set propagateChildLeft(propagateChildLeft: boolean) {
    this._propagateChildLeft = propagateChildLeft;
  }

  @Output() complete: EventEmitter<void>;

  @Output() makeParentUnnavigable = new EventEmitter();
  
  @Output() makeParentNavigable = new EventEmitter();

  @Output() sendRefToParent = new EventEmitter();

  constructor(
    private elementRef: ElementRef,
    private sanitizer:DomSanitizer,
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
  
  // After child elements retrieved from DOM, convert from array to object for faster access
  ngAfterViewInit() {
    this.elementRef.nativeElement.focus()
    this.children = this._children.toArray().reduce((acc, curr) => (
      {
        ...acc,
        [curr._parentText]: curr
      }
    ), {})
  }
    
  // Recalculate horizontal position at which to spawn menu, correcting for proximity to edges of screen
  validateX(xPos: number, menuWidth: number): number {
    let menuLeft = xPos;
    let menuRight = xPos + menuWidth;
    let screenWidth = window.innerWidth - 10; /* Give a 10 pixel buffer so isn't right on the edge */
    // If initial position or menu too close to right edge of screen, shift left until right edge of menu is at least 10px from right edge of screen
    if (menuRight > screenWidth) {
      this._propagateChildLeft = true;
      let overshoot = menuLeft - screenWidth;
      xPos = xPos - (menuWidth + (overshoot > 0 ? overshoot : 0))
    }
    // If initial position or menu too close to left edge of screen, shift right until left edge of menu is at least 10px from left edge of screen
    if (menuLeft < 10) {
      let difference = 10 - menuLeft;
      xPos = xPos + difference;
    }
    return xPos;
  }

  // Recalculate vertical position at which to spawn menu, correcting for proximity to edges of screen
  validateY(yPos: number, menuHeight: number, parentY?: number): number {
    let menuTop = parentY ? parentY : yPos;
    let menuBottom = menuTop + menuHeight;
    let screenHeight = window.innerHeight - 10; /* Give a 10 pixel buffer so isn't right on the edge */
    // If initial position of menu too close to bottom of screen, shift left until bottom edge of menu is at least 10px from bottom of screen
    if (menuBottom > screenHeight) {
      let overshoot = menuTop - screenHeight;
      yPos = yPos - (menuHeight + (overshoot > 0 ? overshoot : 0));
      if (parentY) {
        yPos += ContextMenuComponent.ItemHeight;
      }
    }
    // If initial position of menu too close to top of screen, shift left until top edge of menu is at least 10px from top of screen
    if (menuTop < 10) {
      let difference = 10 - menuTop;
      yPos = yPos + difference;
    }
    return yPos;
  }

  // Triggered when menu item clicked.
  // If item has associated action and is not disabled, execute action
  itemClicked(menuItem: ContextMenuItem): void {
    if (menuItem.action && !menuItem.disabled) {
      menuItem.action();
    }
    if (!menuItem.preventCloseMenu) {
      this.closeContextMenu();
    }
  }

  // Close context menu
  closeContextMenu = (): void => {
    this.complete.emit();
  }

  // Set active index
  setActiveIndex = (index: number) => {
    this.activeIndex = index;
  }

  computeShortcutString = (item: ContextMenuItem) => {
    let shortcutString = "";
    if (item.shortcutProps) {
      let props = item.shortcutProps;
      if (props.altKey) {
        shortcutString += "Alt ";
      }
      if (props.ctrlKey) {
        shortcutString += "Ctrl ";
      }
      if (props.metaKey) {
        shortcutString += "Cmd ";
      }
      if (props.shiftKey) {
        shortcutString += "Shift ";
      }
    }
    if (item.shortcutText) {
      shortcutString += item.shortcutText;
    }
    return shortcutString;
  }

  generateIcon = (base64Image: string) => {
    return this.sanitizer.bypassSecurityTrustResourceUrl(base64Image);
  }

  shortcutProps?: {
    "code": string;
    "altKey": boolean;
    "ctrlKey": boolean;
    "metaKey": boolean;
    "shiftKey": boolean;
  };

  // When area of screen outside of menu is clicked, close menu
  @HostListener('document:mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if (event && !this.elementRef.nativeElement.contains(event.target) && !this._isChildMenu) {
      this.closeContextMenu();
    }
  }

  // When window resized, close menu
  @HostListener('window:resize')
  onResize(): void {
    this.closeContextMenu();
  }

  // Handle key presses that occur while context menu is open
  @HostListener('window:keydown', ['$event'])
  onWindowKeyDown(event: KeyboardEvent) {
    // console.log(event)
    let mod = (x: number, n: number): number => ((x == -2 ? -1 : x % n) + n) % n;
    let hasChildren;
    if (this.activeIndex > -1) {
      hasChildren = this.menuItems && this.menuItems[this.activeIndex].children ? true : false;
    }
    // Execute action of any visible item whose shortcut has been pressed
    if (this.elementRef.nativeElement.firstChild.scrollWidth > 0) {
      this.menuItems.forEach(item => {
        if (!item.disabled && item.shortcutProps && item.action) {
          // If all properties of shortcut associated with given item match those of key(s) clicked, execute action associated with item.
          if (Object.keys(item.shortcutProps).every(shortcutProp => ((<any>event)[shortcutProp] === (<any>item.shortcutProps)[shortcutProp]))){
            event.preventDefault();
            item.action();
            if (!item.preventCloseMenu) {
              this.closeContextMenu();
            }
          }
        }
      })
    }
    // Perform navigation of navigable menu
    if (this.isNavigable) {
      let newIndex;
      switch (event.key){
        case 'ArrowUp':
          newIndex = mod(this.activeIndex - 1, this.menuItems.length)
          while (this.menuItems[newIndex].disabled) {
            newIndex = mod(newIndex - 1, this.menuItems.length)
          }
          this.activeIndex = newIndex;
          event.stopPropagation();
          event.preventDefault();
          break;
        case 'ArrowDown':
          newIndex = mod(this.activeIndex + 1, this.menuItems.length)
          while (this.menuItems[newIndex].disabled) {
            newIndex = mod(newIndex + 1, this.menuItems.length)
          }
          this.activeIndex = newIndex;
          event.stopPropagation();
          event.preventDefault();
          break;
        case 'ArrowRight':
          if (this._propagateChildLeft) {
            if (this.isNavigable && this._isChildMenu) {
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
          event.stopPropagation();
          event.preventDefault();
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
            if (this.isNavigable && this._isChildMenu) {
              this.makeParentNavigable.emit();
              this.setActiveIndex(-1);
            }
          }
          event.stopPropagation();
          event.preventDefault();
          break;
        case 'Enter':
          let item = this.menuItems[this.activeIndex];
          if (item.action) {
            item.action();
          }
          if (!item.preventCloseMenu) {
            this.closeContextMenu();
          }
          event.stopPropagation();
          event.preventDefault();
          break;
        case 'Escape':
          this.closeContextMenu();
          event.stopPropagation();
          event.preventDefault();
          break;  
      }
    }
  }

  mouseLeave(event: any) {
    this.activeIndex = -1; // When cursor leaves, no item is selected.
  }

}





/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

