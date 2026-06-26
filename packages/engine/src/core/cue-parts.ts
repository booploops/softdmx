/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Cue, CuePart, CuePlaybackState } from "../types";

export function resolveCueParts(cue: Cue): CuePart[] {
  if (cue.parts && cue.parts.length > 0) return cue.parts;
  return (cue.stack ?? []).map((step) => ({
    id: step.id,
    label: step.label,
    fadeIn: step.fadeIn,
    delay: step.follow === "timed" ? step.followTime : 0,
    presetId: step.presetId,
    effectIds: step.effectIds,
  }));
}

export function advanceCuePart(state: CuePlaybackState, cue: Cue): boolean {
  const parts = resolveCueParts(cue);
  const nextIndex = (state.stackStepIndex ?? 0) + 1;
  if (nextIndex >= parts.length) return false;
  state.stackStepIndex = nextIndex;
  state.stackStepStartTime = performance.now();
  return true;
}

export function computePartFadeProgress(state: CuePlaybackState, part: CuePart): number {
  const stepStart = state.stackStepStartTime ?? state.startTime;
  const elapsed = performance.now() - stepStart - (part.delay ?? 0);
  const fadeIn = part.fadeIn ?? 0;
  if (fadeIn <= 0 || elapsed <= 0) return elapsed > 0 ? 1 : 0;
  return Math.min(1, elapsed / fadeIn);
}
