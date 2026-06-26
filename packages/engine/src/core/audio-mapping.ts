/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ShowAudioMapping, ShowDocument } from "../show/document.ts";
import {
  LC_LatrixLasers,
  VRSL_Light5CH,
  VRSL_Spotlight,
} from "../fixture-library/builtin/fixtures.ts";
import { clampDmx } from "./types.ts";

type MappingTarget = {
  path: string;
  attributeType: string;
};

export interface AudioSnapshot {
  rms: number;
  peak: number;
  bands: [number, number, number, number];
  beatPulse: boolean;
}

export interface AudioMappingEvalState {
  smoothedById: Map<string, number>;
  lastUpdateById: Map<string, number>;
}

export function createAudioMappingEvalState(): AudioMappingEvalState {
  return {
    smoothedById: new Map(),
    lastUpdateById: new Map(),
  };
}

const knownFixtures = new Map([
  [VRSL_Spotlight.id, VRSL_Spotlight],
  [VRSL_Light5CH.id, VRSL_Light5CH],
  [LC_LatrixLasers.id, LC_LatrixLasers],
]);

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getSourceValue(mapping: ShowAudioMapping, levels: AudioSnapshot): number {
  switch (mapping.source) {
    case "rms":
      return clamp01(levels.rms);
    case "peak":
      return clamp01(levels.peak);
    case "beat":
      return levels.beatPulse ? 1 : 0;
    case "band": {
      const index = mapping.bandIndex ?? 0;
      if (index < 0 || index > 3) return 0;
      return clamp01(levels.bands[index] ?? 0);
    }
  }
}

function smoothValue(
  mapping: ShowAudioMapping,
  targetValue: number,
  nowMs: number,
  state: AudioMappingEvalState,
): number {
  const prev = state.smoothedById.get(mapping.id);
  if (prev === undefined) {
    state.smoothedById.set(mapping.id, targetValue);
    state.lastUpdateById.set(mapping.id, nowMs);
    return targetValue;
  }

  const lastUpdated = state.lastUpdateById.get(mapping.id) ?? nowMs;
  const dt = Math.max(0, nowMs - lastUpdated);
  const isRising = targetValue > prev;
  const timeConstant = Math.max(0, isRising ? (mapping.attackMs ?? 0) : (mapping.releaseMs ?? 120));
  const alpha = timeConstant <= 0 ? 1 : Math.min(1, dt / timeConstant);
  const smoothed = prev + (targetValue - prev) * alpha;

  state.smoothedById.set(mapping.id, smoothed);
  state.lastUpdateById.set(mapping.id, nowMs);
  return smoothed;
}

function resolveFixtureTarget(
  show: ShowDocument,
  fixtureName: string,
  attribute: string,
): MappingTarget[] {
  const fixture = show.fixtures.find((f) => f.name === fixtureName);
  if (!fixture) return [];
  const definition = knownFixtures.get(fixture.fixtureId);
  if (!definition) return [];

  const channelIndex = definition.channels.findIndex((channel) => channel.name === attribute);
  if (channelIndex === -1) return [];

  return [
    {
      path: `show://${fixtureName}/${channelIndex + 1}`,
      attributeType: definition.channels[channelIndex]?.type ?? "generic",
    },
  ];
}

function resolveMappingTargets(show: ShowDocument, mapping: ShowAudioMapping): MappingTarget[] {
  const attribute = mapping.attribute;
  if (!attribute) return [];

  if (mapping.targetType === "fixture") {
    return resolveFixtureTarget(show, mapping.targetId, attribute);
  }

  if (mapping.targetType === "group") {
    const group = show.groups.find((entry) => entry.name === mapping.targetId);
    if (!group) return [];

    const targets: MappingTarget[] = [];
    for (const fixtureName of group.fixtures) {
      targets.push(...resolveFixtureTarget(show, fixtureName, attribute));
    }
    return targets;
  }

  // Effect/executor/submaster mappings are persisted in document schema but are
  // not channel-addressable output targets in this layer.
  return [];
}

export function evaluateAudioMappings(
  show: ShowDocument,
  levels: AudioSnapshot,
  state: AudioMappingEvalState,
  nowMs = Date.now(),
): Map<string, number> {
  const results = new Map<string, number>();
  const activeMappingIds = new Set<string>();

  if (show.audio?.enabled === false) {
    state.smoothedById.clear();
    state.lastUpdateById.clear();
    return results;
  }

  for (const mapping of show.audioMappings ?? []) {
    if (mapping.enabled === false) continue;

    activeMappingIds.add(mapping.id);
    const source = getSourceValue(mapping, levels);
    const transformed = clamp01(
      (mapping.invert ? 1 - source : source) * (mapping.gain ?? 1) + (mapping.offset ?? 0),
    );
    const min = clampDmx(mapping.min ?? 0);
    const max = clampDmx(mapping.max ?? 255);
    const targetValue = clampDmx(min + transformed * (max - min));
    const smoothed = smoothValue(mapping, targetValue, nowMs, state);

    const targets = resolveMappingTargets(show, mapping);
    for (const target of targets) {
      results.set(target.path, clampDmx(smoothed));
    }
  }

  for (const id of Array.from(state.smoothedById.keys())) {
    if (!activeMappingIds.has(id)) {
      state.smoothedById.delete(id);
      state.lastUpdateById.delete(id);
    }
  }

  return results;
}
