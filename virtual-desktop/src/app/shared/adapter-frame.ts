/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { INNER_IFRAME_NAME } from './named-elements';

/*
  Shared by the application manager, which delivers dispatch data to iframe applications, and the
  iframe plugin component, which answers the adapter's calls, so that both agree on which frame is
  the application's adapter and which origin it must have.
*/

/**
 * Whether the plugin is a remote application with a `destination`. Its iframe URL is answered by the
 * app server with a fixed wrapper page (zlux-server-framework lib/default-remote-app-template.html)
 * holding one iframe named INNER_IFRAME_NAME that points at the configured destination. Only for these
 * plugins is an element with that name known to be the framework's own.
 */
export function usesRemoteWrapper(plugin: ZLUX.Plugin): boolean {
  const webContent = plugin.getWebContent();
  return !!webContent && webContent.destination > '';
}

/**
 * The frame the iframe adapter runs in, the only frame the desktop exchanges bridge and dispatch
 * messages with. For a destination plugin this is the INNER_IFRAME_NAME iframe in the wrapper, or null
 * while the wrapper has not created it. For any other plugin it is the plugin's own iframe; an element
 * named INNER_IFRAME_NAME inside an ordinary plugin page is page content (an embedded document,
 * third-party content, injected markup), not a wrapper, and is never descended into.
 */
export function getAdapterFrame(iframeId: string, remoteWrapper: boolean): HTMLIFrameElement | null {
  const iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
  if (!iframe || !iframe.contentWindow) {
    return null;
  }
  if (!remoteWrapper) {
    return iframe;
  }
  try {
    const innerIframe = iframe.contentWindow.document.getElementById(INNER_IFRAME_NAME);
    // The element belongs to the wrapper's realm, so instanceof HTMLIFrameElement would be false.
    if (innerIframe && innerIframe.tagName === 'IFRAME' && (innerIframe as HTMLIFrameElement).contentWindow) {
      return innerIframe as HTMLIFrameElement;
    }
  } catch (e) {
    // The wrapper's document is not on the desktop origin, so it is not the app server's wrapper.
  }
  return null;
}

/**
 * The origin the adapter frame was pointed at, or null if it has none a message can be addressed to
 * (no src, or an opaque origin). The frame's src attribute does not follow navigation inside the frame,
 * so this stays the origin the desktop or the wrapper chose even after the page has gone elsewhere.
 */
export function getAdapterFrameOrigin(frame: HTMLIFrameElement): string | null {
  try {
    const origin = new URL(frame.src, frame.ownerDocument.baseURI).origin;
    return origin === 'null' ? null : origin;
  } catch (e) {
    return null;
  }
}
