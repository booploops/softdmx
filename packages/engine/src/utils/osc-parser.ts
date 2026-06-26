/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export interface ParsedOscAddress {
  type:
    | "fixture_channel"
    | "group_master"
    | "cue_trigger"
    | "cue_stack_go"
    | "preset"
    | "blackout"
    | "grandmaster";
  fixtureName?: string;
  channelIndex?: number;
  groupName?: string;
  cueId?: string;
  presetId?: string;
  action?: string;
}

/**
 * Parses a native direct-addressable SoftDMX namespace.
 * Returns structured properties, or null if it does not match the direct namespace.
 */
export function parseDirectOscAddress(address: string): ParsedOscAddress | null {
  if (!address || !address.startsWith("/softdmx/")) return null;

  const parts = address.split("/").filter(Boolean); // e.g. ['softdmx', 'fixture', 'Spot_1', 'channel', '1']
  if (parts.length < 2 || parts[0] !== "softdmx") return null;

  const command = parts[1];

  switch (command) {
    case "blackout":
      return { type: "blackout" };

    case "grandmaster":
      return { type: "grandmaster" };

    case "fixture":
      if (parts[3] === "channel" && parts[2] && parts[4]) {
        const channelIndex = parseInt(parts[4], 10);
        if (!isNaN(channelIndex)) {
          return {
            type: "fixture_channel",
            fixtureName: parts[2],
            channelIndex,
          };
        }
      }
      break;

    case "group":
      if (parts[3] === "master" && parts[2]) {
        return {
          type: "group_master",
          groupName: parts[2],
        };
      }
      break;

    case "preset":
      if (parts[2]) {
        return { type: "preset", presetId: parts[2] };
      }
      break;

    case "cue":
      if (parts[2] && parts[3]) {
        return {
          type: "cue_trigger",
          cueId: parts[2],
          action: parts[3], // 'go' or 'stop'
        };
      }
      break;
  }

  return null;
}

/**
 * Converts float arguments (0.0 - 1.0) or integer arguments (0 - 255) to DMX range (0-255).
 */
export function parseOscValue(arg: any): number {
  if (typeof arg !== "number") return 0;
  // If it's a float between 0.0 and 1.0, scale to 0-255
  if (arg >= 0 && arg <= 1.0 && !Number.isInteger(arg)) {
    return Math.round(arg * 255);
  }
  // Otherwise, cap to integer bounds
  return Math.max(0, Math.min(255, Math.round(arg)));
}
