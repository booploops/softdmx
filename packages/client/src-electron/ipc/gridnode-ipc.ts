/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { BrowserWindow, ipcMain } from "electron";
import { isGridNodeOverlayVisible, setGridNodeOverlayVisible } from "../windows/gridnode-overlay";

let ipcRegistered = false;

function broadcastOverlayState(): void {
  const visible = isGridNodeOverlayVisible();
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send("gridnode-overlay-changed", visible);
    }
  }
}

function onSetVisible(_event: Electron.IpcMainEvent, visible: unknown): void {
  if (typeof visible !== "boolean") return;
  setGridNodeOverlayVisible(visible);
  broadcastOverlayState();
}

function onGetVisible(event: Electron.IpcMainInvokeEvent): boolean {
  return isGridNodeOverlayVisible();
}

export function setupGridNodeOverlayIpc(): void {
  if (ipcRegistered) return;

  ipcMain.on("gridnode-overlay-set", onSetVisible);
  ipcMain.handle("gridnode-overlay-get", onGetVisible);
  ipcRegistered = true;
}

export function closeGridNodeOverlayIpc(): void {
  if (!ipcRegistered) return;

  ipcMain.removeListener("gridnode-overlay-set", onSetVisible);
  ipcMain.removeHandler("gridnode-overlay-get");
  ipcRegistered = false;
}
