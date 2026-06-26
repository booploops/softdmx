/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ActiveChannel, Cue, CuePlaybackState } from "../types";
import type { ShowDocument } from "../show/document";
import { presetToChannels } from "./preset-resolver";
import { clampDmx } from "./types";
import { computePartFadeProgress, resolveCueParts } from "./cue-parts";

export function evaluateCuePartsAtTime(
  show: ShowDocument,
  cue: Cue,
  state: CuePlaybackState,
  baseChannels: ActiveChannel[],
  previousCueOutput?: Map<string, number>,
): ActiveChannel[] {
  const parts = resolveCueParts(cue);
  if (parts.length === 0) {
    return baseChannels.map((ch) => ({ ...ch }));
  }

  const partIndex = state.stackStepIndex ?? 0;
  const part = parts[Math.min(partIndex, parts.length - 1)]!;
  const result = baseChannels.map((ch) => ({ ...ch }));
  const fadeProgress = computePartFadeProgress(state, part);

  if (part.presetId) {
    const preset = show.presets.find((entry) => entry.id === part.presetId);
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

  if (part.targets) {
    for (const target of part.targets) {
      const fixtureNames =
        target.fixtures ??
        (target.group
          ? (show.groups.find((group) => group.name === target.group)?.fixtures ?? [])
          : []);
      for (const fixtureName of fixtureNames) {
        for (const [attrName, value] of Object.entries(target.attrs)) {
          const fixture = show.fixtures.find((entry) => entry.name === fixtureName);
          if (!fixture) continue;
          const pathPrefix = `show://${fixtureName}/`;
          for (const ch of result) {
            if (!ch.path.startsWith(pathPrefix)) continue;
            const channelIndex = Number(ch.path.slice(pathPrefix.length));
            if (!Number.isFinite(channelIndex)) continue;
            ch.value = clampDmx(ch.value + ((value as number) - ch.value) * fadeProgress);
          }
        }
      }
    }
  }

  const tracking = part.tracking ?? cue.tracking ?? false;
  const block = part.block ?? cue.block ?? true;
  if (!block && tracking) {
    const reference = previousCueOutput ?? new Map(baseChannels.map((ch) => [ch.path, ch.value]));
    return result.filter((ch) => {
      const previous = reference.get(ch.path);
      return previous === undefined || previous !== ch.value;
    });
  }

  return result;
}
