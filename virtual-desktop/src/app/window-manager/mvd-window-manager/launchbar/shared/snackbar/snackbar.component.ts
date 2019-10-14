

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Inject, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { MatSnackBarRef, MAT_SNACK_BAR_DATA } from '@angular/material';

const SNACKBAR_WRAP_LENGTH = 450;

@Component({
  selector: 'app-snackbar',
  templateUrl: './snackbar.component.html',
  styleUrls: [ 'snackbar.component.css' ]
})
export class SnackbarComponent implements AfterViewInit {
  public showThreeDots: boolean = false;
  @ViewChild('snackbarContainer') snackbarContainer: ElementRef;

  constructor(public snackBarRef: MatSnackBarRef<SnackbarComponent>,
    @Inject(MAT_SNACK_BAR_DATA) public data: any) {
      if (this.showThreeDots) {
        // Avoid value never used compilation error
      }
      
  }

  ngAfterViewInit() {
    this.snackBarRef.afterOpened().subscribe(action => {
      let element = (<HTMLImageElement>document.getElementsByClassName('snackbar-container')[0]);
      let width = element.clientWidth;
      if (width && width > SNACKBAR_WRAP_LENGTH) {
        this.showThreeDots = true;
      }
    });
  }


}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
