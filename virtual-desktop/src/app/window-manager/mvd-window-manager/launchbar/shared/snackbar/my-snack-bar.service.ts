// import { Injectable } from '@angular/core';
// import { MatSnackBar } from '@angular/material';
// import { MySnackbarComponent } from './my-snackbar.component';

// @Injectable({
//   providedIn: 'root'
// })
// export class MySnackBarService {
//   constructor(private snackBar: MatSnackBar) {}
//   public openSnackBar(message: string, action: string, snackType?: any) {
//     const _snackType: any = snackType !== undefined ? snackType : 'Success';

//     this.snackBar.openFromComponent(MySnackbarComponent, {
//       duration: 2000,
//       horizontalPosition: 'end',
//       verticalPosition: 'top',
//       data: { message: message, snackType: _snackType }
//     });
//   }
// }