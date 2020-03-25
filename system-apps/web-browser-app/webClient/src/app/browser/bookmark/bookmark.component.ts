/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, Input } from '@angular/core';
import { Bookmark } from '../shared';
import { NavigationService, BookmarksService } from '../services';

@Component({
  selector: 'app-bookmark',
  templateUrl: './bookmark.component.html',
  styleUrls: ['./bookmark.component.scss']
})
export class BookmarkComponent implements OnInit {

  @Input() bookmark: Bookmark;

  constructor(
    private navigation: NavigationService,
    private bookmarks: BookmarksService,
  ) { }

  ngOnInit(): void {
  }

  navigate(): void {
    this.navigation.navigateUsingBookmark(this.bookmark);
  }

  remove(): void {
    this.bookmarks.remove(this.bookmark.url);
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
