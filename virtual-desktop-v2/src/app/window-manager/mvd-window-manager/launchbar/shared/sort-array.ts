/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: "sortBy"
})
export class SortArray implements PipeTransform {
  transform(array: any[], attribute: string): any[] {
    array.sort((a: any, b: any) => {
      if (a[attribute] < b[attribute]) {
        return -1;
      } else if (a[attribute] > b[attribute]) {
        return 1;
      } else {
        return 0;
      }
    });
    return array;
  }
}
