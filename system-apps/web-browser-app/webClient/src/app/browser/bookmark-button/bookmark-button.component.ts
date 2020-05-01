/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, Input } from '@angular/core';
import { BookmarksService } from '../services';

@Component({
  selector: 'app-bookmark-button',
  templateUrl: './bookmark-button.component.html',
  styleUrls: ['./bookmark-button.component.scss']
})
export class BookmarkButtonComponent implements OnInit {

  @Input() url: string;

  constructor(
    private bookmarks: BookmarksService,
  ) { }

  ngOnInit(): void {
  }

  get bookmarked(): boolean {
    return !!this.bookmarks.findByURL(this.url);
  }

  toggleBookmark(): void {
    if (this.bookmarked) {
      this.bookmarks.remove(this.url);
    } else {
      this.bookmarks.add(this.url);
    }
  }

  get color(): string {
    return this.bookmarked ? 'yellow' : 'black';
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
