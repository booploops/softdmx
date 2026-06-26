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
import { buildOutputNodeUrl, configureOutputNodeWindow } from "../modes/output-node";
import { setupOscListener } from "../ipc/osc-ipc";
import { setupAbletonLink } from "../ipc/link-ipc";

export async function createOutputNodeWindow(currentDir: string): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    icon: path.resolve(currentDir, "icons/icon.png"),
    width: 360,
    height: 240,
    show: false,
    useContentSize: true,
    backgroundColor: "#1D1D1D",
    resizable: false,
    maximizable: false,
    titleBarStyle: "default",
    webPreferences: {
      contextIsolation: true,
      preload: path.resolve(currentDir, "preload.js"),
    },
  });

  configureOutputNodeWindow(window);

  setupVideoIpc(window);
  setBackupPrimaryWindow(window);

  const appBase = isDev() ? getDevUrl() : `http://127.0.0.1:${AppState.port}/app/`;
  const loadUrl = buildOutputNodeUrl(appBase);
  await window.loadURL(loadUrl);

  setupOscListener(window);
  setupAbletonLink(window);

  return window;
}
