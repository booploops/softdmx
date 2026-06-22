/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Cue } from 'src/types';
import type { ShowTimelineConfig } from 'src/types/show-document';

function cueDurationMs(cue: Cue): number {
  if (cue.view === 'stack' && cue.stack?.length) {
    return cue.stack.reduce((acc, step) => acc + step.fadeIn + (step.followTime ?? 0), 0);
  }

  const layers = cue.layers ?? [];
  if (layers.length === 0) return cue.totalDuration || 0;

  return Math.max(
    ...layers.map((layer) =>
      layer.frames.reduce((acc, frame) => acc + (frame.duration ?? 1000), 0)
    ),
    0
  );
}

export type ActiveSetCue = {
  cue: Cue;
  localMs: number;
};

export function getCueTimecodeInSeconds(cue: Cue): number | null {
  if (typeof cue.timecodeIn !== 'number' || !Number.isFinite(cue.timecodeIn)) return null;
  return Math.max(0, cue.timecodeIn);
}

export function getCueTimecodeOutSeconds(cue: Cue): number | null {
  if (typeof cue.timecodeOut === 'number' && Number.isFinite(cue.timecodeOut)) {
    return Math.max(0, cue.timecodeOut);
  }

  const timecodeIn = getCueTimecodeInSeconds(cue);
  if (timecodeIn === null) return null;

  const durationSec = cueDurationMs(cue) / 1000;
  return timecodeIn + Math.max(0, durationSec);
}

export function getActiveTimelineCuesAtTimecode(cues: Cue[], timecodeSeconds: number): ActiveSetCue[] {
  const position = Math.max(0, timecodeSeconds);
  const active: ActiveSetCue[] = [];

  for (const cue of cues) {
    if (cue.view !== 'timeline') continue;

    const timecodeIn = getCueTimecodeInSeconds(cue);
    if (timecodeIn === null) continue;

    const timecodeOut = getCueTimecodeOutSeconds(cue);
    if (timecodeOut !== null && position >= timecodeOut) continue;
    if (position < timecodeIn) continue;

    active.push({
      cue,
      localMs: Math.max(0, (position - timecodeIn) * 1000),
    });
  }

  return active.sort((a, b) => (getCueTimecodeInSeconds(a.cue) ?? 0) - (getCueTimecodeInSeconds(b.cue) ?? 0));
}

export function computeSetTimelineDurationMs(cues: Cue[], timeline?: ShowTimelineConfig): number {
  const configured = timeline?.durationMs;
  if (typeof configured === 'number' && configured > 0) return configured;

  let maxEndMs = 60_000;

  for (const cue of cues) {
    if (cue.view !== 'timeline') continue;
    const timecodeIn = getCueTimecodeInSeconds(cue);
    if (timecodeIn === null) continue;
    const endSec = getCueTimecodeOutSeconds(cue) ?? timecodeIn;
    maxEndMs = Math.max(maxEndMs, endSec * 1000);
  }

  for (const asset of timeline?.audioAssets ?? []) {
    const endMs = (asset.offsetMs ?? 0) + asset.durationMs;
    maxEndMs = Math.max(maxEndMs, endMs);
  }

  return Math.max(60_000, maxEndMs);
}
