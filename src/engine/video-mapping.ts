/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ShowDocument } from 'src/show/document';
import {
  resolvePixelMapVideoGain,
  resolvePixelMapVideoSmoothingMs,
  resolveVideoPixelMapIds,
} from '../utils/video-defaults.ts';
import { flattenPixelMatrixToChannels, type PixelColor } from './pixel-mapper.ts';
import { clampDmx } from './types.ts';

export interface VideoMappingEvalState {
  smoothedByPath: Map<string, number>;
  lastUpdateByPath: Map<string, number>;
}

export function createVideoMappingEvalState(): VideoMappingEvalState {
  return {
    smoothedByPath: new Map(),
    lastUpdateByPath: new Map(),
  };
}

function applyGainAndBlack(pixel: PixelColor, gain: number, blackLevel: number): PixelColor {
  return {
    r: clampDmx(pixel.r * gain - blackLevel),
    g: clampDmx(pixel.g * gain - blackLevel),
    b: clampDmx(pixel.b * gain - blackLevel),
  };
}

function smoothValue(
  stateKey: string,
  target: number,
  smoothingMs: number,
  nowMs: number,
  state: VideoMappingEvalState
): number {
  const prev = state.smoothedByPath.get(stateKey);
  if (prev === undefined || smoothingMs <= 0) {
    state.smoothedByPath.set(stateKey, target);
    state.lastUpdateByPath.set(stateKey, nowMs);
    return target;
  }

  const last = state.lastUpdateByPath.get(stateKey) ?? nowMs;
  const dt = Math.max(0, nowMs - last);
  const alpha = 1 - Math.exp(-dt / Math.max(1, smoothingMs));
  const next = prev + (target - prev) * alpha;
  state.smoothedByPath.set(stateKey, next);
  state.lastUpdateByPath.set(stateKey, nowMs);
  return clampDmx(next);
}

function smoothStateKey(mapId: string, path: string): string {
  return `${mapId}|${path}`;
}

export function evaluateVideoMapping(
  show: ShowDocument,
  pixelsByMapId: Map<string, PixelColor[][]> | null,
  state: VideoMappingEvalState,
  nowMs = performance.now()
): Map<string, number> {
  const results = new Map<string, number>();
  const video = show.video;
  const mapIds = resolveVideoPixelMapIds(video);

  if (!video?.enabled || !pixelsByMapId || mapIds.length === 0) {
    state.smoothedByPath.clear();
    state.lastUpdateByPath.clear();
    return results;
  }

  const blackLevel = video.blackLevel ?? 0;
  const activeStateKeys = new Set<string>();

  for (const mapId of mapIds) {
    const pixels = pixelsByMapId.get(mapId);
    const pixelMap = (show.pixelMaps ?? []).find((map) => map.id === mapId);
    if (!pixels || !pixelMap) continue;

    const gain = resolvePixelMapVideoGain(pixelMap, video);
    const smoothingMs = resolvePixelMapVideoSmoothingMs(pixelMap, video);

    const adjusted = pixels.map((row) =>
      row.map((pixel) => applyGainAndBlack(pixel, gain, blackLevel))
    );

    const mapped = flattenPixelMatrixToChannels(pixelMap, adjusted);
    for (const entry of mapped) {
      const key = smoothStateKey(mapId, entry.path);
      activeStateKeys.add(key);
      const smoothed = smoothValue(key, entry.value, smoothingMs, nowMs, state);
      results.set(entry.path, Math.max(results.get(entry.path) ?? 0, smoothed));
    }
  }

  for (const key of Array.from(state.smoothedByPath.keys())) {
    if (!activeStateKeys.has(key)) {
      state.smoothedByPath.delete(key);
      state.lastUpdateByPath.delete(key);
    }
  }

  return results;
}
