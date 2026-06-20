/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ActiveChannel, Cue, CuePlaybackState } from 'src/types';
import type { ShowDocumentV1 } from 'src/types/show-document';
import { evaluateCuePartsAtTime } from './cue-parts-playback';
import { resolveCueParts } from './cue-parts';
import { presetToChannels } from './preset-resolver';
import { clampDmx } from './types';

export function evaluateStackCueAtTime(
  show: ShowDocumentV1,
  cue: Cue,
  state: CuePlaybackState,
  baseChannels: ActiveChannel[],
  previousCueOutput?: Map<string, number>
): ActiveChannel[] {
  const parts = resolveCueParts(cue);
  if (parts.length > 0) {
    return evaluateCuePartsAtTime(show, cue, state, baseChannels, previousCueOutput);
  }

  const stack = cue.stack ?? [];
  if (stack.length === 0) {
    return baseChannels.map((ch) => ({ ...ch }));
  }

  const stepIndex = state.stackStepIndex ?? 0;
  const step = stack[Math.min(stepIndex, stack.length - 1)]!;
  const result = baseChannels.map((ch) => ({ ...ch }));
  const fadeProgress = computeStackFadeProgress(state, step);

  if (step.presetId) {
    const preset = show.presets.find((p) => p.id === step.presetId);
    if (preset) {
      const presetMap = presetToChannels(show, preset);
      for (const ch of result) {
        const presetVal = presetMap.get(ch.path);
        if (presetVal) {
          const target = presetVal.value;
          ch.value = clampDmx(ch.value + (target - ch.value) * fadeProgress);
        }
      }
    }
  }

  return result;
}

function computeStackFadeProgress(
  state: CuePlaybackState,
  step: NonNullable<Cue['stack']>[number]
): number {
  const stepStart = state.stackStepStartTime ?? state.startTime;
  const elapsed = performance.now() - stepStart;
  if (step.fadeIn <= 0) return 1;
  return Math.min(1, elapsed / step.fadeIn);
}

export function advanceStackStep(state: CuePlaybackState, cue: Cue): boolean {
  const parts = resolveCueParts(cue);
  if (parts.length > 0) {
    const nextIndex = (state.stackStepIndex ?? 0) + 1;
    if (nextIndex >= parts.length) return false;
    state.stackStepIndex = nextIndex;
    state.stackStepStartTime = performance.now();
    return true;
  }

  const stack = cue.stack ?? [];
  if (stack.length === 0) return false;

  const nextIndex = (state.stackStepIndex ?? 0) + 1;
  if (nextIndex >= stack.length) {
    return false;
  }

  state.stackStepIndex = nextIndex;
  state.stackStepStartTime = performance.now();
  return true;
}

export function initStackPlayback(state: CuePlaybackState): void {
  state.stackStepIndex = 0;
  state.stackStepStartTime = performance.now();
}
