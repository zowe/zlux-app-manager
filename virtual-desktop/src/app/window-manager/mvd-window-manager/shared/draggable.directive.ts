

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { ChangeDetectorRef, Directive, ElementRef, HostListener, Input, OnInit } from '@angular/core';

import { DesktopWindow } from './desktop-window';
//import { BaseLogger } from 'virtual-desktop-logger';

@Directive({
  selector: '[rs-com-draggable]'
})
export class DraggableDirective implements OnInit {
  //private readonly logger: ZLUX.ComponentLogger = BaseLogger;
  private static readonly draggleCss = ' cursor-draggable';

  @Input('rs-com-draggable-window') desktopWindow: DesktopWindow;
  @Input('rs-com-draggable-handle') handle: HTMLElement;
  @Input('rs-com-draggable-enabled') draggable: boolean;
  topOffset: number;
  leftOffset: number;
  mouseDown: boolean;

  public static topLeft(e: MouseEvent | TouchEvent): {top: number, left: number} {
    let mouseTouch: MouseEvent | Touch;

    if (e instanceof MouseEvent) {
      mouseTouch = e as MouseEvent;
    } else {
      mouseTouch = (e as TouchEvent).changedTouches[0];
    }

    return {top: mouseTouch.clientY, left: mouseTouch.clientX};
  }

  constructor(
    public element: ElementRef, private ref: ChangeDetectorRef
  ) {
    this.topOffset = 0;
    this.leftOffset = 0;
    this.mouseDown = false;
    ref.detach(); // deactivate change detection
    setInterval(() => {
      this.ref.detectChanges(); // manually trigger change detection
    }, 17);
  }

  // TODO: This is a bit of a mess
  ngOnInit(): void {
    let {className} = this.element.nativeElement;

    if (this.draggable) {
      if (className.indexOf(DraggableDirective.draggleCss) < 0) {
        className += DraggableDirective.draggleCss;
      }
    } else {
      className = className.replace(DraggableDirective.draggleCss, '');
    }

    this.element.nativeElement.className = className;
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    //this.logger.debug('Draggable=Down');

    if (!this.draggable || event.button === 2 || (this.handle !== undefined && event.target !== this.handle)) {
      return;
    }

    this.mouseDown = true;
    this.setTopLeft(event);
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent | null): void {
    if (this.mouseDown) {
      this.mouseDown = false;
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.mouseDown) {
      this.move(event);
      event.stopPropagation();
    }
  }

  @HostListener('document:mouseleave', ['$event'])
  onMouseLeave(event: MouseEvent): void {
    this.onMouseMove(event);
  }

  // Touch events are used for mobile/touch devices, similar to ones above
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: Event): void {
    this.mouseDown = true;
    this.setTopLeft(event as TouchEvent);
    event.stopPropagation();
  }

  @HostListener('document:touchend', ['$event'])
  onTouchEnd(): void {
    this.onMouseUp(null);
  }

  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: Event): void {
    if (this.mouseDown) {
      this.move(event as TouchEvent);
    }

    event.stopPropagation();
  }

  setTopLeft(event: MouseEvent | TouchEvent): void {
    const {top, left} = DraggableDirective.topLeft(event);

    this.topOffset  = top  - this.desktopWindow.windowState.position.top;
    this.leftOffset = left - this.desktopWindow.windowState.position.left;
  }

  move(event: MouseEvent | TouchEvent): void {
    const {top, left} = DraggableDirective.topLeft(event);
    const {width, height} = this.desktopWindow.windowState.position;

    const nTop = (top - this.topOffset);
    const nLeft = (left - this.leftOffset);
    this.desktopWindow.windowState.position = { top: nTop, left: nLeft, width: width, height: height};
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

