/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ProgrammerSessionEvent } from "../../types/programmer.ts";
import type { ScratchEntry } from "../layers/scratch.ts";

export interface ReplayState {
  entries: Map<string, ScratchEntry>;
  blind: boolean;
}

export function replaySessionEventsToState(
  events: ProgrammerSessionEvent[],
  atSec: number,
  initial?: ReplayState,
): ReplayState {
  const state: ReplayState = {
    entries: new Map(initial?.entries ?? []),
    blind: initial?.blind ?? false,
  };

  for (const event of events) {
    if (event.tSec > atSec) break;

    switch (event.kind) {
      case "channel": {
        if (!event.path || event.value === undefined) break;
        state.entries.set(event.path, {
          path: event.path,
          value: event.value,
          attributeType: event.meta?.source ?? "generic",
          attributeName: undefined,
          feature: event.meta?.feature,
          touchedAt: Math.round(event.tSec * 1000),
          clientId: event.clientId ?? event.meta?.clientId,
          meta: event.meta,
          seq: event.meta?.seq,
        });
        break;
      }
      case "channels": {
        for (const ch of event.channels ?? []) {
          state.entries.set(ch.path, {
            path: ch.path,
            value: ch.value,
            attributeType: ch.attributeType ?? "generic",
            touchedAt: Math.round(event.tSec * 1000),
            clientId: event.clientId ?? event.meta?.clientId,
            meta: event.meta,
          });
        }
        break;
      }
      case "clear":
        state.entries.clear();
        break;
      case "blind":
        state.blind = event.blind ?? true;
        break;
      default:
        break;
    }
  }

  return state;
}

export function replaySessionToEntries(
  events: ProgrammerSessionEvent[],
  atSec: number,
): ScratchEntry[] {
  return Array.from(replaySessionEventsToState(events, atSec).entries.values());
}
