/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { screen, type BrowserWindow } from "electron";
import { AppState } from "../state/main";

let overlayVisible = false;
let hasGridnodeDestination = false;

function getOverlayWindow(): BrowserWindow | null {
  const win = AppState.artnetWindow;
  if (!win || win.isDestroyed()) return null;
  return win;
}

function ensureOverlayWindowVisibleOnScreen(win: BrowserWindow): void {
  const bounds = win.getBounds();
  const displays = screen.getAllDisplays();

  const isVisibleOnAnyDisplay = displays.some((display) => {
    const area = display.workArea;
    const overlapWidth = Math.max(0, Math.min(bounds.x + bounds.width, area.x + area.width) - Math.max(bounds.x, area.x));
    const overlapHeight = Math.max(0, Math.min(bounds.y + bounds.height, area.y + area.height) - Math.max(bounds.y, area.y));
    return overlapWidth > 0 && overlapHeight > 0;
  });

  if (isVisibleOnAnyDisplay) return;

  const { workArea } = screen.getPrimaryDisplay();
  const nextX = Math.round(workArea.x + (workArea.width - bounds.width) / 2);
  const nextY = Math.round(workArea.y + (workArea.height - bounds.height) / 2);
  win.setPosition(nextX, nextY);
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

  if (overlayVisible) {
    ensureOverlayWindowVisibleOnScreen(win);
    win.show();
  } else {
    win.hide();
  }
}
