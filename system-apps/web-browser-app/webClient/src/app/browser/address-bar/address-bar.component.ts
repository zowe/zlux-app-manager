/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { NavigationService } from '../services/navigation.service';
import { ProxyService } from '../services/proxy.service';
import { Subscription } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

@Component({
  selector: 'app-address-bar',
  templateUrl: './address-bar.component.html',
  styleUrls: ['./address-bar.component.scss']
})
export class AddressBarComponent implements OnInit, OnDestroy {
  urlControl: FormControl;
  proxyControl: FormControl;
  placeholder = 'URL';
  proxyValueSubscription: Subscription;

  constructor(
    private navigation: NavigationService,
    private proxy: ProxyService,
  ) {
    this.urlControl = new FormControl(navigation.startURL);
    this.proxyControl = new FormControl(this.proxy.isEnabled());
    this.proxyValueSubscription = this.proxyControl.valueChanges.pipe(
      throttleTime(300),
    ).subscribe(() => this.proxy.toggle());
  }

  ngOnInit() {
  }

  navigate(): void {
    if (this.urlControl.value) {
      this.navigation.navigate(
        this.addSchemeIfNeeded(this.urlControl.value)
      );
    }
  }

  refresh(): void {
    this.navigation.refresh();
  }

  goBack(): void {
    const url = this.navigation.goBack();
    if (url) {
      this.urlControl.setValue(url);
    }
  }

  goForward(): void {
    const url = this.navigation.goForward();
    if (url) {
      this.urlControl.setValue(url);
    }
  }

  get canGoForward(): boolean {
    return this.navigation.canGoForward();
  }

  get canGoBack(): boolean {
    return this.navigation.canGoBack();
  }

  private addSchemeIfNeeded(url: string): string {
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      return `http://${url}`;
    }
    return url;
  }

  ngOnDestroy(): void {
    if (this.proxyValueSubscription && !this.proxyValueSubscription.closed) {
      this.proxyValueSubscription.unsubscribe();
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
