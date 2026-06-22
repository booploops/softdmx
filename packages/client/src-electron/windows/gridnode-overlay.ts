/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { BrowserWindow } from 'electron';
import { AppState } from '../state/main';

let overlayVisible = false;
let hasGridnodeDestination = false;

function getOverlayWindow(): BrowserWindow | null {
  const win = AppState.artnetWindow;
  if (!win || win.isDestroyed()) return null;
  return win;
}

export function isGridNodeOverlayVisible(): boolean {
  return overlayVisible;
}

export function setHasGridnodeDestination(hasDestination: boolean): void {
  hasGridnodeDestination = hasDestination;
  applyGridNodeOverlayWindowState();
}

export function setGridNodeOverlayVisible(visible: boolean): boolean {
  overlayVisible = visible;
  applyGridNodeOverlayWindowState();
  return overlayVisible;
}

export function applyGridNodeOverlayWindowState(): void {
  const win = getOverlayWindow();
  if (!win) return;

  if (overlayVisible && hasGridnodeDestination) {
    win.show();
  } else {
    win.hide();
  }
}
