/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { BrowserWindow } from "electron";
import path from "path";
import { AppState } from "../state/main";
import { getDevUrl, isDev } from "../runtime/env";
import { setupVideoIpc } from "../ipc/video-ipc";
import { setBackupPrimaryWindow } from "../backup/coordinator";
import { createArtnetWindow } from "./artnet-window";
import { applyGridNodeOverlayWindowState } from "./gridnode-overlay";
import { setupOscListener } from "../ipc/osc-ipc";
import { setupAbletonLink } from "../ipc/link-ipc";

export async function createMainWindow(currentDir: string): Promise<BrowserWindow> {
  const mainWindow = new BrowserWindow({
    icon: path.resolve(currentDir, "icons/icon.png"),
    width: 1000,
    height: 600,
    show: true,
    useContentSize: true,
    backgroundColor: "#1D1D1D",
    resizable: true,
    maximizable: true,
    titleBarOverlay: {
      color: "#1D1D1D",
      symbolColor: "#FFFFFF",
    },
    trafficLightPosition: {
      x: 12,
      y: 16,
    },
    titleBarStyle: "hidden",
    webPreferences: {
      contextIsolation: true,
      preload: path.resolve(currentDir, "preload.js"),
    },
  });

  setupVideoIpc(mainWindow);
  setBackupPrimaryWindow(mainWindow);

  const appBase = isDev() ? getDevUrl() : `http://127.0.0.1:${AppState.port}/app/`;
  await mainWindow.loadURL(appBase);

  if (process.env.DEBUGGING) {
    mainWindow.webContents.openDevTools();
  }

  AppState.artnetWindow = await createArtnetWindow();
  applyGridNodeOverlayWindowState();

  setupOscListener(mainWindow);
  setupAbletonLink(mainWindow);

  return mainWindow;
}
