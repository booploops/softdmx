/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { UniverseHealthStatus } from 'src/types/output-health';

export function createInitialHealth(
  destinationId: string,
  protocol: UniverseHealthStatus['protocol'],
  universe: number,
  role: UniverseHealthStatus['role'] = 'primary'
): UniverseHealthStatus {
  return {
    destinationId,
    protocol,
    universe,
    online: false,
    lastSendMs: 0,
    sendFps: 0,
    channelCount: 0,
    overflow: false,
    errors: [],
    role,
  };
}

export function updateHealthAfterSend(
  health: UniverseHealthStatus,
  channelCount: number,
  overflow: boolean,
  nowMs = Date.now()
): UniverseHealthStatus {
  const elapsed = health.lastSendMs > 0 ? nowMs - health.lastSendMs : 0;
  const sendFps = elapsed > 0 ? Math.round(1000 / elapsed) : health.sendFps;
  return {
    ...health,
    online: true,
    lastSendMs: nowMs,
    sendFps,
    channelCount,
    overflow,
  };
}
