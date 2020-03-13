/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavigationService } from '../services/navigation.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-browser-window',
  templateUrl: './browser-window.component.html',
  styleUrls: ['./browser-window.component.css']
})
export class BrowserWindowComponent implements OnInit {
  url$: Observable<SafeResourceUrl>;

  constructor(
    private domSanitizer: DomSanitizer,
    private navigation: NavigationService,
  ) {
    this.url$ = this.navigation.urlSubject.pipe(
      map(url => this.domSanitizer.bypassSecurityTrustResourceUrl(url)),
    );
  }

  ngOnInit() {
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
