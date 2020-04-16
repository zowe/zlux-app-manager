/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, OnInit, HostBinding } from '@angular/core';
import { BookmarksService, SettingsService } from '../services';

@Component({
  selector: 'app-bookmark-bar',
  templateUrl: './bookmark-bar.component.html',
  styleUrls: ['./bookmark-bar.component.scss']
})
export class BookmarkBarComponent implements OnInit {

  constructor(
    private settings: SettingsService,
    public bookmarks: BookmarksService,
  ) { }

  ngOnInit(): void {
    this.bookmarks.update();
  }

  @HostBinding('hidden') get isHidden(): boolean {
    return !this.settings.areControlsVisible();
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
