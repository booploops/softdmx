/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from './server';
import { createArtnetWindow } from './artnet-window';
import { AppState } from './state/main';
import { getDevUrl, isDev } from './utils';
import { Paths } from './utils/paths';
import { setupOscListener, closeOscListener } from './output/electron-osc';
import { setupAbletonLink, closeAbletonLink } from './output/electron-link';
import { setupGridNodeOverlayIpc, closeGridNodeOverlayIpc } from './output/electron-gridnode';
import { applyGridNodeOverlayWindowState } from './output/gridnode-overlay';
import { setupVideoIpc, closeVideoIpc } from './video/electron-video';
import {
  buildOutputNodeUrl,
  configureOutputNodeWindow,
  isOutputNodeMode,
} from './output/output-node';
import { setBackupPrimaryWindow } from './output/backup-coordinator';

app.setPath('userData', Paths.appData);

const currentDir = fileURLToPath(new URL('.', import.meta.url));

let mainWindow: BrowserWindow | undefined;
let shutdownStarted = false;
let shutdownComplete = false;

function destroyAuxiliaryWindows() {
  if (AppState.artnetWindow && !AppState.artnetWindow.isDestroyed()) {
    AppState.artnetWindow.destroy();
  }
  AppState.artnetWindow = null;
}

function runShutdownCleanup() {
  closeOscListener();
  closeAbletonLink();
  closeGridNodeOverlayIpc();
  void closeVideoIpc();
  destroyAuxiliaryWindows();
}

async function shutdownAndQuit() {
  if (shutdownStarted) return;
  shutdownStarted = true;

  runShutdownCleanup();

  // Give native ThreadSafeFunction callbacks a tick to drain before exit.
  await new Promise((resolve) => setTimeout(resolve, 50));

  shutdownComplete = true;
  app.quit();
}

async function createWindow() {
  startServer();
  setupGridNodeOverlayIpc();

  const outputNode = isOutputNodeMode();

  mainWindow = new BrowserWindow({
    icon: path.resolve(currentDir, 'icons/icon.png'),
    width: outputNode ? 360 : 1000,
    height: outputNode ? 240 : 600,
    show: !outputNode,
    useContentSize: true,
    backgroundColor: '#1D1D1D',
    resizable: !outputNode,
    maximizable: !outputNode,
    titleBarOverlay: outputNode
      ? undefined
      : {
          color: '#1D1D1D',
          symbolColor: '#FFFFFF',
        },
    trafficLightPosition: outputNode
      ? undefined
      : {
          x: 12,
          y: 16,
        },
    titleBarStyle: outputNode ? 'default' : 'hidden',
    webPreferences: {
      contextIsolation: true,
      preload: path.resolve(
        currentDir,
        path.join(process.env.QUASAR_ELECTRON_PRELOAD_FOLDER, 'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION)
      ),
    },
  });

  if (outputNode) {
    configureOutputNodeWindow(mainWindow);
  }

  setupVideoIpc(mainWindow);
  setBackupPrimaryWindow(mainWindow);

  const appBase = isDev() ? getDevUrl() : `http://127.0.0.1:${AppState.port}/app/`;
  const loadUrl = outputNode ? buildOutputNodeUrl(appBase) : appBase;
  await mainWindow.loadURL(loadUrl);

  if (process.env.DEBUGGING && !outputNode) {
    mainWindow.webContents.openDevTools();
  }

  if (!outputNode) {
    AppState.artnetWindow = await createArtnetWindow();
    applyGridNodeOverlayWindowState();
  }

  setupOscListener(mainWindow);
  setupAbletonLink(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = undefined;
    void shutdownAndQuit();
  });
}

void app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  void shutdownAndQuit();
});

app.on('before-quit', (event) => {
  if (shutdownComplete) return;
  if (!shutdownStarted) {
    event.preventDefault();
    void shutdownAndQuit();
  }
});

app.on('activate', () => {
  // if (mainWindow === undefined) {
    // void createWindow();
  // }
});
