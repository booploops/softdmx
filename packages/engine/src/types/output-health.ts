/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export interface UniverseHealthStatus {
  destinationId: string;
  protocol: "artnet" | "sacn" | "dmx_usb" | "gridnode";
  universe: number;
  online: boolean;
  lastSendMs: number;
  sendFps: number;
  channelCount: number;
  overflow: boolean;
  errors: string[];
  role?: "primary" | "standby";
}
