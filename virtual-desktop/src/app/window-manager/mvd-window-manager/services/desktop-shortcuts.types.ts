/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

export interface DesktopShortcutAction {
  /** Unique ID for the action (e.g. 'org.zowe.terminal.tn3270.open-session') */
  id: string;
  /** Human-readable action name */
  name: string;
  /** Target plugin identifier */
  targetPluginId: string;
  /** ActionTargetMode: 'PluginCreate' | 'PluginFindAnyOrCreate' | 'PluginFindUniqueOrCreate' */
  targetMode: string;
  /** ActionType: 'Launch' | 'Message' | 'Route' | 'Focus' */
  type: string;
  /** Template for the primaryArgument passed to dispatcher.makeAction */
  primaryArgument?: any;
  /** The event context data passed to dispatcher.invokeAction */
  launchMetadata?: any;
}

export interface DesktopShortcut {
  /** Unique identifier for this shortcut instance */
  id: string;
  /** Plugin to launch (always required -- identifies the app for icon/label fallback) */
  pluginId: string;
  /** Grid position */
  gridRow: number;
  gridCol: number;
  /** Optional custom label (overrides the plugin's default label) */
  displayLabel?: string;
  /** Optional custom icon URL (overrides the plugin's default icon) */
  displayIcon?: string;
  /** Optional action to invoke instead of a plain launch */
  action?: DesktopShortcutAction;
  /** If set, this shortcut belongs to a folder rather than the top-level desktop grid */
  folderId?: string;
}

export interface DesktopFolder {
  /** Unique identifier for this folder */
  id: string;
  /** User-visible name */
  name: string;
  /** Grid position on the desktop (or -1/-1 if only in taskbar/launch menu) */
  gridRow: number;
  gridCol: number;
  /** Optional custom icon URL (overrides the auto-generated child icon grid) */
  displayIcon?: string;
}

/**
 * Validate and sanitize an icon URL to prevent script injection and path traversal.
 * Returns the URL unchanged if safe, or undefined if the URL is rejected.
 */
export function sanitizeIconUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  const schemeLower = trimmed.toLowerCase().replace(/[\s\x00-\x1f]/g, '');
  if (/^(javascript|vbscript|data(?!:image\/)):/i.test(schemeLower)) {
    return undefined;
  }

  if (/\.\.[\\/]/.test(trimmed) || trimmed.includes('..%2f') || trimmed.includes('..%5c')
      || trimmed.toLowerCase().includes('..%252f')) {
    return undefined;
  }

  if (/[<>"'`{}]/.test(trimmed)) {
    return undefined;
  }

  if (/\\x[0-9a-fA-F]{2}/.test(trimmed) || /\x00/.test(trimmed) || /%00/.test(trimmed)) {
    return undefined;
  }

  if (/xn--/i.test(trimmed)) {
    return undefined;
  }

  if (/^data:image\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }

  return undefined;
}

/** Generate a unique shortcut ID */
export function generateShortcutId(): string {
  return 'sc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
}

/** Generate a unique folder ID */
export function generateFolderId(): string {
  return 'folder-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
