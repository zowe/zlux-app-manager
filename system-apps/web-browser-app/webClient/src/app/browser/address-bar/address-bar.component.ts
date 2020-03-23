/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { NavigationService, ProxyService } from '../services';
import { SettingsService } from '../services/settings.service';

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
  proxyStateSubscription: Subscription;

  constructor(
    private navigation: NavigationService,
    private proxy: ProxyService,
    private settings: SettingsService,
  ) {
    this.urlControl = new FormControl(navigation.startURL);
    this.proxyControl = new FormControl(this.proxy.isEnabled());
    this.proxyValueSubscription = this.proxyControl.valueChanges.pipe(
      throttleTime(300),
    ).subscribe(() => this.proxy.toggle());
    this.proxyStateSubscription = this.proxy.proxyState.subscribe((state) => this.proxyControl.setValue(state, {emitEvent: false}));
  }

  ngOnInit() {
  }
  
  @HostBinding('hidden') get isHidden(): boolean {
    return !this.settings.areControlsVisible();
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
    if (this.proxyStateSubscription && !this.proxyStateSubscription.closed) {
      this.proxyStateSubscription.unsubscribe();
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
