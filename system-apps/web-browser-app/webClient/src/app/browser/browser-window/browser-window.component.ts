/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavigationService } from '../services';
import { map } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-browser-window',
  templateUrl: './browser-window.component.html',
  styleUrls: ['./browser-window.component.scss']
})
export class BrowserWindowComponent implements OnInit, OnDestroy {
  currentProxyPort: number;
  url: SafeResourceUrl;
  urlSubscription: Subscription;

  constructor(
    private domSanitizer: DomSanitizer,
    private navigation: NavigationService,
  ) {
    this.urlSubscription = this.navigation.iframeURL$.pipe(
      map(url => this.domSanitizer.bypassSecurityTrustResourceUrl(url))
    ).subscribe(url => this.url = url);
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    if (this.urlSubscription && !this.urlSubscription.closed) {
      this.urlSubscription.unsubscribe();
    }
    this.navigation.stop();
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
