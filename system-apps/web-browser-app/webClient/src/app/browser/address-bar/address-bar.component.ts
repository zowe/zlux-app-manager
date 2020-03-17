/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { NavigationService } from '../services/navigation.service';

@Component({
  selector: 'app-address-bar',
  templateUrl: './address-bar.component.html',
  styleUrls: ['./address-bar.component.css']
})
export class AddressBarComponent implements OnInit {
  url: FormControl;
  placeholder = 'URL';

  constructor(
    private navigation: NavigationService,
  ) {
    this.url = new FormControl(navigation.startPage);
  }

  ngOnInit() {
  }

  navigate(): void {
    if (this.url.value) {
      this.navigation.navigate(
        this.addSchemeIfNeeded(this.url.value)
      );
    }
  }

  private addSchemeIfNeeded(url: string): string {
    if (!url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
