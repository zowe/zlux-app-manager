
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, NgZone } from '@angular/core';

@Component({
  selector: 'app-mobile',
  templateUrl: './mobile.component.html',
  styleUrls: ['./mobile.component.css'],
})
export class MobileComponent implements OnInit {
  component: any;
  callbacks: ZLUX.ApplicationCallbacks;

  constructor(
    private zone: NgZone,
  ) { }

  ngOnInit(): void {
    if ('plugins' in window) {
      (window as any).plugins.intentShim.onIntent((intent: any) => {
        if (intent.extras && this.callbacks && this.callbacks.onMessage) {
          this.zone.run(
            () => this.callbacks.onMessage(intent.extras)
          );
        }
      });
    }
  }

  onActivate(event: any): void {
    this.component = event;
    if (typeof this.component.provideZLUXDispatcherCallbacks === 'function') {
      this.callbacks = this.component.provideZLUXDispatcherCallbacks();
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
