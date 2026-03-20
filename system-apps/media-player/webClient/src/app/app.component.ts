/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, Inject, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';

declare const ZoweZLUX: any;

/** File extensions recognised as HTML5 video. */
const VIDEO_EXTENSIONS: ReadonlySet<string> = new Set([
  'mp4', 'webm', 'ogv', 'ogg', 'm4v', 'mov'
]);

/** File extensions recognised as HTML5 audio. */
const AUDIO_EXTENSIONS: ReadonlySet<string> = new Set([
  'mp3', 'wav', 'oga', 'ogg', 'aac', 'flac', 'm4a', 'opus'
]);

/** Map of extension → MIME type hint passed to <source type="…">. */
const MIME_MAP: Readonly<Record<string, string>> = {
  'mp4':  'video/mp4',
  'webm': 'video/webm',
  'ogv':  'video/ogg',
  'm4v':  'video/mp4',
  'mov':  'video/quicktime',
  'mp3':  'audio/mpeg',
  'wav':  'audio/wav',
  'oga':  'audio/ogg',
  'ogg':  'audio/ogg',
  'aac':  'audio/aac',
  'flac': 'audio/flac',
  'm4a':  'audio/mp4',
  'opus': 'audio/ogg; codecs=opus'
};

export type MediaType = 'video' | 'audio' | 'unsupported' | 'none';

@Component({
  selector: 'app-media-player',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  /** The USS path that was requested for playback. */
  filePath: string = '';

  /** Sanitised URL pointing at the ZSS file-contents endpoint. */
  mediaUrl: SafeUrl | null = null;

  /** Whether the resolved path is video, audio, unsupported, or not yet set. */
  mediaType: MediaType = 'none';

  /** MIME type hint shown to the <source> element. */
  mimeType: string = '';

  /** Human-readable error shown when the file type is unsupported. */
  errorMessage: string = '';

  constructor(
    @Inject(Angular2InjectionTokens.LAUNCH_METADATA) private launchMetadata: any,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    if (this.launchMetadata != null &&
        this.launchMetadata.data &&
        this.launchMetadata.data.filePath) {
      this.loadMedia(this.launchMetadata.data.filePath);
    }
  }

  // ---------------------------------------------------------------------------
  // Public helpers (used in template)
  // ---------------------------------------------------------------------------

  get fileName(): string {
    if (!this.filePath) { return ''; }
    const parts = this.filePath.split('/');
    return parts[parts.length - 1];
  }

  get isVideo(): boolean { return this.mediaType === 'video'; }
  get isAudio(): boolean { return this.mediaType === 'audio'; }
  get isUnsupported(): boolean { return this.mediaType === 'unsupported'; }
  get isReady(): boolean { return this.mediaType !== 'none'; }

  // ---------------------------------------------------------------------------
  // Core logic
  // ---------------------------------------------------------------------------

  private getExtension(path: string): string {
    const dot = path.lastIndexOf('.');
    return dot === -1 ? '' : path.substring(dot + 1).toLowerCase();
  }

  /**
   * Builds the ZSS file-contents URL and wires up the media player.
   *
   * ZoweZLUX.uriBroker.unixFileUri expects the path WITHOUT a leading slash,
   * so we normalise `filePath` before passing it.
   */
  private loadMedia(path: string): void {
    this.filePath = path;
    this.errorMessage = '';
    this.mediaUrl = null;

    const ext = this.getExtension(path);

    if (VIDEO_EXTENSIONS.has(ext)) {
      this.mediaType = 'video';
    } else if (AUDIO_EXTENSIONS.has(ext)) {
      this.mediaType = 'audio';
    } else {
      this.mediaType = 'unsupported';
      this.errorMessage = ext
        ? `".${ext}" files are not supported for HTML5 media playback.`
        : 'Cannot determine the file type — no extension found.';
      return;
    }

    this.mimeType = MIME_MAP[ext] || '';

    // ZSS unixFileUri expects a path without a leading slash.
    const normalised = path.startsWith('/') ? path.substring(1) : path;
    const rawUrl: string = ZoweZLUX.uriBroker.unixFileUri('contents', normalised);

    // Angular requires explicit trust for resource URLs used in media src.
    this.mediaUrl = this.sanitizer.bypassSecurityTrustUrl(rawUrl);
  }

  // ---------------------------------------------------------------------------
  // ZLUX messaging integration
  // ---------------------------------------------------------------------------

  zluxOnMessage(eventContext: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (eventContext != null &&
          eventContext.data &&
          eventContext.data.filePath) {
        this.loadMedia(eventContext.data.filePath);
        resolve(undefined);
      } else {
        reject('Event context missing or malformed — expected { data: { filePath: string } }');
      }
    });
  }

  provideZLUXDispatcherCallbacks(): ZLUX.ApplicationCallbacks {
    return {
      onMessage: (eventContext: any): Promise<any> => {
        return this.zluxOnMessage(eventContext);
      }
    };
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
