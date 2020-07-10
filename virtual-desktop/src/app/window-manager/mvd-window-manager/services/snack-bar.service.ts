
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarRef, SimpleSnackBar } from '@angular/material';
import { ThemeEmitterService } from './theme-emitter.service';

@Injectable()
export class SnackBarService {

  constructor(private snackBar: MatSnackBar, 
    private themeService: ThemeEmitterService) { }

  dismiss() {
    this.snackBar.dismiss();
  }

  open(message: string, action?: string, duration?: number): MatSnackBarRef<SimpleSnackBar> {
    let snackBarClass = 'personalization-snackbar';
    let size;
    switch(this.themeService.mainSize) {
      case 1: {
        size = '-small'; break;
      }
      case 3: {
        size = '-large'; break;
      }
      default: {
        size = '-medium'; break;
      }
    }
    return this.snackBar.open(message, action, { duration: duration || 6000000, panelClass: [snackBarClass, snackBarClass+size] });
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
