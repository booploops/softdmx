/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { BrowserWindow } from 'electron';
import type { ActiveChannel } from '@softdmx/engine';

let primaryWindow: BrowserWindow | null = null;
let standbyActive = false;
let lastHeartbeatMs = 0;
let lastPrimaryState: ActiveChannel[] = [];

export function setBackupPrimaryWindow(window: BrowserWindow | null) {
  primaryWindow = window;
}

export function markPrimaryHeartbeat(nowMs = Date.now()) {
  lastHeartbeatMs = nowMs;
}

export function publishPrimaryState(channels: ActiveChannel[]) {
  lastPrimaryState = channels;
  if (!primaryWindow || primaryWindow.isDestroyed()) return;
  primaryWindow.webContents.send('backup:state', { channels, at: Date.now() });
}

export function isStandbyActive() {
  return standbyActive;
}

export function setStandbyActive(active: boolean) {
  standbyActive = active;
}

export function getLastPrimaryState() {
  return lastPrimaryState;
}

export function isPrimaryAlive(timeoutMs: number, nowMs = Date.now()) {
  if (lastHeartbeatMs <= 0) return false;
  return nowMs - lastHeartbeatMs <= timeoutMs;
}

export function getLastHeartbeatMs() {
  return lastHeartbeatMs;
}
