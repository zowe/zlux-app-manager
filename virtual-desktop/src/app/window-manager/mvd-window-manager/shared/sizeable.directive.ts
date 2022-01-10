

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { ChangeDetectorRef, Directive, HostListener, Input, OnInit } from '@angular/core';

import { DesktopWindow } from './desktop-window';
import { DraggableDirective } from './draggable.directive';

// TODO calculate the size of Compass
const enum Compass {
  n, s, e, w, ne, nw, se, sw, size
}

@Directive({
  selector: '[rs-com-sizeable]'
})
export class SizeableDirective implements OnInit {
  @Input('rs-com-sizeable-window') desktopWindow: DesktopWindow;
  @Input('rs-com-sizeable-min-width') minWidth: number;
  @Input('rs-com-sizeable-min-height') minHeight: number;
  @Input('rs-com-sizeable-n') handle_n: HTMLElement;
  @Input('rs-com-sizeable-s') handle_s: HTMLElement;
  @Input('rs-com-sizeable-e') handle_e: HTMLElement;
  @Input('rs-com-sizeable-w') handle_w: HTMLElement;
  @Input('rs-com-sizeable-ne') handle_ne: HTMLElement;
  @Input('rs-com-sizeable-nw') handle_nw: HTMLElement;
  @Input('rs-com-sizeable-se') handle_se: HTMLElement;
  @Input('rs-com-sizeable-sw') handle_sw: HTMLElement;
  @Input('rs-com-sizeable-enabled') sizeable: boolean;

  top: number;
  left: number;
  overshootWidth: number;
  overshootHeight: number;
  handle: HTMLElement | null;
  handles: Array<HTMLElement>;

  constructor(private ref: ChangeDetectorRef) {
    this.top = 0;
    this.left = 0;
    this.overshootWidth = 0;
    this.overshootHeight = 0;
    this.handle = null;
    this.handles = new Array<HTMLElement>(Compass.size);
    ref.detach(); // deactivate change detection
    setInterval(() => {
      this.ref.detectChanges(); // manually trigger change detection
    }, 17);
  }

  ngOnInit(): void {
    const {handles, handle_n, handle_e, handle_s, handle_w, handle_ne, handle_nw, handle_se, handle_sw} = this;

    handles[Compass.n] = handle_n;
    handles[Compass.s] = handle_s;
    handles[Compass.e] = handle_e;
    handles[Compass.w] = handle_w;
    handles[Compass.ne] = handle_ne;
    handles[Compass.nw] = handle_nw;
    handles[Compass.se] = handle_se;
    handles[Compass.sw] = handle_sw;
  }

  get mouseDown(): boolean {
    return this.handle != null;
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if (event.button !== 2) {
      this.testDownTarget(event.target!, event);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent | null): void {
    if (this.mouseDown) {
      this.handle = null;
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.mouseDown) {
      this.resize(event);
      event.stopPropagation();
    }
  }

  @HostListener('document:mouseleave', ['$event'])
  onMouseLeave(event: MouseEvent): void {
    this.onMouseUp(null);
  }

  // Touch events are used for mobile/touch devices, similar to ones above
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: Event): void {
    this.testDownTarget(event.target!, event as TouchEvent);
    event.stopPropagation();
  }

  @HostListener('document:touchend', ['$event'])
  onTouchEnd(): void {
    this.onMouseUp(null);
  }

  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: Event): void {
    if (this.mouseDown) {
      this.resize(event as TouchEvent);
    }

    event.stopPropagation();
  }

  testDownTarget(target: EventTarget, event: MouseEvent|TouchEvent): void {
    if (this.sizeable) {
      for (const handle of this.handles) {
        if (target === handle) {
          this.handle = handle;
          this.setTopLeft(event);
          break;
        }
      }
    }
  }

  resize(event: MouseEvent | TouchEvent): void {
    const {top, left} = DraggableDirective.topLeft(event);
    const [topDelta, leftDelta] = [top - this.top, left - this.left];
    const compass: Compass = this.handles.indexOf(this.handle!);

    [this.top, this.left] = [top, left];

    switch (compass) {
      case Compass.n:
      case Compass.s:
      case Compass.e:
      case Compass.w:
        this.resizeCompass(compass, topDelta, leftDelta);
        break;
      case Compass.ne:
        this.resizeCompass(Compass.e, topDelta, leftDelta);
        this.resizeCompass(Compass.n, topDelta, leftDelta);
        break;
      case Compass.nw:
        this.resizeCompass(Compass.w, topDelta, leftDelta);
        this.resizeCompass(Compass.n, topDelta, leftDelta);
        break;
      case Compass.se:
        this.resizeCompass(Compass.e, topDelta, leftDelta);
        this.resizeCompass(Compass.s, topDelta, leftDelta);
        break;
      case Compass.sw:
        this.resizeCompass(Compass.w, topDelta, leftDelta);
        this.resizeCompass(Compass.s, topDelta, leftDelta);
        break;
    }
  }

  resizeCompass(compass: Compass, topDelta: number, leftDelta: number): void {
    let { top, left, width, height } = this.desktopWindow.windowState.position;
    switch (compass) {
      case Compass.n:
        topDelta = Math.max(-top, topDelta);
        top += topDelta;
        height -= topDelta;
        break;
      case Compass.s:
        height += topDelta;
        break;
      case Compass.e:
        width += leftDelta;
        break;
      case Compass.w:
        leftDelta = Math.max(-left, leftDelta);
        left += leftDelta;
        width -= leftDelta;
        break;
    }

    if (this.overshootWidth > 0 && width > this.minWidth) {
      const loss = Math.min(width - this.minWidth, this.overshootWidth);
      this.overshootWidth -= loss;
      width -= loss;
      if(compass == Compass.w) {
        left += loss;
      }
    }

    if (this.overshootHeight > 0 && height > this.minHeight) {
      const loss = Math.min(height - this.minHeight, this.overshootHeight);
      this.overshootHeight -= loss;
      height -= loss;
      if(compass == Compass.n) {
        top += loss;
      }
    }

    if (width < this.minWidth) {
      this.overshootWidth += this.minWidth - width;
      if(compass == Compass.w) {
        left -= this.minWidth - width;
      }
      width = this.minWidth;
    }

    if (height < this.minHeight) {
      this.overshootHeight += this.minHeight - height;
      if(compass == Compass.n) {
        top -= this.minHeight - height;
      }
      height = this.minHeight;
    }

    this.desktopWindow.windowState.position = { top: top, left: left, width: width, height: height };
  }

  setTopLeft(event: MouseEvent | TouchEvent): void {
    const {top, left} = DraggableDirective.topLeft(event);

    [this.top, this.left] = [top, left];
    [this.overshootWidth, this.overshootHeight] = [0, 0];
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

