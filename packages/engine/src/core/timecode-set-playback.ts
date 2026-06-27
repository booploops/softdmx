/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Cue } from "../types";
import type { ShowTimelineConfig } from "../show/document";
import type { TimelineClip, TimelineTrack } from "../types/cue";

function cueDurationMs(cue: Cue): number {
  if (cue.view === "stack" && cue.stack?.length) {
    return cue.stack.reduce((acc, step) => acc + step.fadeIn + (step.followTime ?? 0), 0);
  }

  const layers = cue.layers ?? [];
  if (layers.length === 0) return cue.totalDuration || 0;

  return Math.max(
    ...layers.map((layer) =>
      layer.frames.reduce((acc, frame) => acc + (frame.duration ?? 1000), 0),
    ),
    0,
  );
}

export type ActiveSetCue = {
  cue: Cue;
  localMs: number;
};

type TimelineCueInterval = {
  cue: Cue;
  inSec: number;
  outSec: number;
  sourceClip?: TimelineClip;
  sourceTrack?: TimelineTrack;
};

export function getCueTimecodeInSeconds(cue: Cue): number | null {
  if (typeof cue.timecodeIn !== "number" || !Number.isFinite(cue.timecodeIn)) return null;
  return Math.max(0, cue.timecodeIn);
}

export function getCueTimecodeOutSeconds(cue: Cue): number | null {
  if (typeof cue.timecodeOut === "number" && Number.isFinite(cue.timecodeOut)) {
    return Math.max(0, cue.timecodeOut);
  }

  const timecodeIn = getCueTimecodeInSeconds(cue);
  if (timecodeIn === null) return null;

  const durationSec = cueDurationMs(cue) / 1000;
  return timecodeIn + Math.max(0, durationSec);
}

function cueIntervalsFromTracks(cues: Cue[], timeline?: ShowTimelineConfig): TimelineCueInterval[] {
  const tracks = timeline?.tracks ?? [];
  if (tracks.length === 0) return [];
  const cueById = new Map(cues.map((cue) => [cue.id, cue]));
  const intervals: TimelineCueInterval[] = [];
  for (const track of tracks) {
    if (track.enabled === false || track.kind !== "cue") continue;
    for (const clip of track.clips ?? []) {
      if (!clip.cueId) continue;
      const cue = cueById.get(clip.cueId);
      if (!cue || cue.view !== "timeline") continue;
      const inSec = Math.max(0, Number.isFinite(clip.startSec) ? clip.startSec : 0);
      const outSec = Math.max(
        inSec,
        Number.isFinite(clip.endSec) ? clip.endSec : inSec + Math.max(0.001, cueDurationMs(cue) / 1000),
      );
      intervals.push({ cue, inSec, outSec, sourceClip: clip, sourceTrack: track });
    }
  }
  return intervals;
}

function cueIntervalsFromCueTimecodes(cues: Cue[]): TimelineCueInterval[] {
  const intervals: TimelineCueInterval[] = [];
  for (const cue of cues) {
    if (cue.view !== "timeline") continue;
    const inSec = getCueTimecodeInSeconds(cue);
    if (inSec === null) continue;
    const outSec = getCueTimecodeOutSeconds(cue) ?? inSec;
    intervals.push({ cue, inSec, outSec: Math.max(inSec, outSec) });
  }
  return intervals;
}

function resolveTimelineCueIntervals(cues: Cue[], timeline?: ShowTimelineConfig): TimelineCueInterval[] {
  const fromTracks = cueIntervalsFromTracks(cues, timeline);
  if (fromTracks.length > 0) return fromTracks;
  return cueIntervalsFromCueTimecodes(cues);
}

export function getActiveTimelineCuesAtTimecode(
  cues: Cue[],
  timecodeSeconds: number,
  timeline?: ShowTimelineConfig,
): ActiveSetCue[] {
  const position = Math.max(0, timecodeSeconds);
  const active: ActiveSetCue[] = [];

  for (const interval of resolveTimelineCueIntervals(cues, timeline)) {
    if (position >= interval.outSec) continue;
    if (position < interval.inSec) continue;

    active.push({
      cue: interval.cue,
      localMs: Math.max(0, (position - interval.inSec) * 1000),
    });
  }

  return active.sort(
    (a, b) =>
      (getCueTimecodeInSeconds(a.cue) ?? 0) - (getCueTimecodeInSeconds(b.cue) ?? 0),
  );
}

export function computeSetTimelineDurationMs(cues: Cue[], timeline?: ShowTimelineConfig): number {
  const configured = timeline?.durationMs;
  if (typeof configured === "number" && configured > 0) return configured;

  let maxEndMs = 60_000;

  for (const interval of resolveTimelineCueIntervals(cues, timeline)) {
    const endSec = interval.outSec;
    maxEndMs = Math.max(maxEndMs, endSec * 1000);
  }

  for (const asset of timeline?.audioAssets ?? []) {
    const endMs = (asset.offsetMs ?? 0) + asset.durationMs;
    maxEndMs = Math.max(maxEndMs, endMs);
  }

  for (const section of timeline?.sections ?? []) {
    maxEndMs = Math.max(maxEndMs, Math.max(section.startSec, section.endSec, 0) * 1000);
  }

  return Math.max(60_000, maxEndMs);
}
