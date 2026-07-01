/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { CuePart, RecordedFrame } from "../../types/cue.ts";
import type { PresetTarget } from "../../show/document.ts";
import type { ProgrammerSessionEvent } from "../../types/programmer.ts";
import { replaySessionEventsToState } from "./session-replay.ts";

export interface SessionBakeOptions {
  clientId?: string;
  fromSec?: number;
  toSec?: number;
  fadeMs?: number;
}

export function filterSessionEvents(
  events: ProgrammerSessionEvent[],
  options?: SessionBakeOptions,
): ProgrammerSessionEvent[] {
  return events.filter((event) => {
    if (options?.fromSec !== undefined && event.tSec < options.fromSec) return false;
    if (options?.toSec !== undefined && event.tSec > options.toSec) return false;
    if (options?.clientId && event.clientId && event.clientId !== options.clientId) return false;
    return true;
  });
}

export function bakeSessionToPresetTargets(
  events: ProgrammerSessionEvent[],
  atSec: number,
  options?: SessionBakeOptions,
): PresetTarget[] {
  const filtered = filterSessionEvents(events, options);
  const state = replaySessionEventsToState(filtered, atSec);
  const attrsByFixture = new Map<string, Record<string, number>>();

  for (const entry of state.entries.values()) {
    const parts = entry.path.split("/");
    const fixtureName = parts[2];
    if (!fixtureName) continue;
    const attrName = entry.attributeName ?? parts[parts.length - 1] ?? entry.path;
    if (!attrsByFixture.has(fixtureName)) attrsByFixture.set(fixtureName, {});
    attrsByFixture.get(fixtureName)![attrName] = entry.value;
  }

  return Array.from(attrsByFixture.entries()).map(([fixture, attrs]) => ({
    fixtures: [fixture],
    attrs,
  }));
}

export function bakeStoreEventsToCueParts(
  events: ProgrammerSessionEvent[],
  options?: SessionBakeOptions,
): CuePart[] {
  const filtered = filterSessionEvents(events, options);
  const parts: CuePart[] = [];

  for (const event of filtered) {
    if (event.kind !== "store") continue;
    parts.push({
      id: `bake-${event.tSec}-${parts.length}`,
      label: event.label ?? event.presetId ?? `Store @ ${event.tSec.toFixed(1)}s`,
      presetId: event.presetId,
      fadeIn: options?.fadeMs ?? 1000,
      delay: Math.round(event.tSec * 1000),
    });
  }

  return parts;
}

export function bakeSessionToKeyframe(
  events: ProgrammerSessionEvent[],
  atSec: number,
  options?: SessionBakeOptions,
): RecordedFrame {
  const state = replaySessionEventsToState(filterSessionEvents(events, options), atSec);
  return {
    name: `Session @ ${atSec.toFixed(2)}s`,
    type: "channels",
    channels: Array.from(state.entries.values()).map((entry) => ({
      id: 0,
      path: entry.path,
      value: entry.value,
      attributeType: entry.attributeType,
    })),
    duration: options?.fadeMs ?? 1000,
    easing: "linear",
  };
}
