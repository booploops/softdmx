/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import {
  connectTextureBridge,
  disconnectTextureBridge,
  listTextureSenders,
  setTextureBridgeWindow,
  type TextureBridgeConnectConfig,
} from '../video/texture-bridge-service';

let connected = false;

function registerVideoHandler<T extends unknown[], R>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: T) => R | Promise<R>
) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}

export function setupVideoIpc(mainWindow: BrowserWindow) {
  setTextureBridgeWindow(mainWindow);

  registerVideoHandler('video-list-senders', async () => listTextureSenders());

  registerVideoHandler(
    'video-connect',
    async (_event, config: TextureBridgeConnectConfig) => {
      connected = await connectTextureBridge(config);
      return connected;
    }
  );

  registerVideoHandler('video-disconnect', async () => {
    await disconnectTextureBridge();
    connected = false;
  });

  registerVideoHandler('video-status', async () => ({
    connected,
    platform: process.platform,
  }));
}

export async function closeVideoIpc() {
  await disconnectTextureBridge();
  connected = false;
}
