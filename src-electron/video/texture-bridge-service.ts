/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { BrowserWindow } from 'electron';

export interface TextureSenderInfo {
  name: string;
  appName?: string;
}

export interface TextureBridgeConnectConfig {
  kind: 'syphon' | 'spout';
  senderName: string;
  fps: number;
}

type BridgeModule = {
  listSenders: () => Array<{ name: string; appName?: string }>;
  TextureReceiver: new (senderName: string) => {
    hasNewFrame(): boolean;
    receiveFrame(): { width: number; height: number; data: Buffer } | null;
    stop(): void;
  };
};

let bridgeModule: BridgeModule | null | undefined;
let receiver: InstanceType<BridgeModule['TextureReceiver']> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let activeConfig: TextureBridgeConnectConfig | null = null;
let mainWindow: BrowserWindow | null = null;

async function loadBridge(): Promise<BridgeModule | null> {
  if (bridgeModule !== undefined) return bridgeModule;
  try {
    bridgeModule = (await import('@napolab/texture-bridge')) as BridgeModule;
  } catch (error) {
    console.warn('texture-bridge unavailable:', error);
    bridgeModule = null;
  }
  return bridgeModule;
}

function emitFrame(width: number, height: number, data: Buffer) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('video-frame', {
    width,
    height,
    data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  });
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function setTextureBridgeWindow(window: BrowserWindow) {
  mainWindow = window;
}

export async function listTextureSenders(): Promise<TextureSenderInfo[]> {
  const bridge = await loadBridge();
  if (!bridge) return [];
  try {
    return bridge.listSenders();
  } catch {
    return [];
  }
}

export async function connectTextureBridge(config: TextureBridgeConnectConfig): Promise<boolean> {
  const bridge = await loadBridge();
  if (!bridge || !config.senderName) return false;

  await disconnectTextureBridge();

  try {
    receiver = new bridge.TextureReceiver(config.senderName);
    activeConfig = config;

    const intervalMs = Math.max(16, Math.floor(1000 / Math.max(1, config.fps)));
    pollTimer = setInterval(() => {
      if (!receiver || !activeConfig) return;
      if (!receiver.hasNewFrame()) return;
      const frame = receiver.receiveFrame();
      if (!frame) return;

      emitFrame(frame.width, frame.height, frame.data);
    }, intervalMs);

    return true;
  } catch (error) {
    console.warn('connectTextureBridge failed:', error);
    await disconnectTextureBridge();
    return false;
  }
}

export async function disconnectTextureBridge(): Promise<void> {
  stopPolling();
  activeConfig = null;
  receiver?.stop();
  receiver = null;
}
