/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { EffectDefinition } from "../../types/effects";
import type { ShowDocument } from "../../show/document";
import { resolveEffectTargets } from "../preset-resolver";
import { clampDmx } from "../types";
import { phaseToTheta, thetaToLfoValue } from "../../utils/link-lfo";
import { computeSpreadPhase, waveformValue } from "./spread";

export interface EffectEvalContext {
  timeMs: number;
  linkPhase?: number;
  linkEnabled?: boolean;
}

function hashToUnit(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function evaluateEffect(
  show: ShowDocument,
  effect: EffectDefinition,
  ctx: EffectEvalContext,
): Map<string, number> {
  const results = new Map<string, number>();
  if (!effect.enabled) return results;

  const targets = resolveEffectTargets(show, effect.target);
  if (targets.length === 0) return results;

  const timeSec = ctx.timeMs / 1000;
  let phase = timeSec;

  if (effect.sync === "link" && ctx.linkEnabled && ctx.linkPhase !== undefined) {
    phase = ctx.linkPhase;
  }

  for (const target of targets) {
    let value = 0;

    switch (effect.type) {
      case "sine": {
        const theta = phaseToTheta(phase * effect.rate, 1);
        const lfo = thetaToLfoValue(theta);
        const base = effect.offset ?? 128;
        value = clampDmx(base + (lfo - 128) * effect.depth);
        break;
      }
      case "saw": {
        const t = (phase * effect.rate) % 1;
        value = clampDmx(effect.min + t * (effect.max - effect.min));
        break;
      }
      case "step": {
        if (effect.steps.length === 0) break;
        const stepIndex = Math.floor(phase * effect.rate) % effect.steps.length;
        value = clampDmx(effect.steps[stepIndex]!);
        break;
      }
      case "chase": {
        const total = targets.length;
        const safeTotal = Math.max(1, total);
        const wings = Math.max(1, Math.floor(effect.wings ?? 1));
        const wingSize = Math.max(1, Math.ceil(safeTotal / wings));
        const wingIndex = Math.floor(target.fixtureIndex / wingSize);
        const indexInWingRaw = target.fixtureIndex % wingSize;
        const indexInWing = wingIndex % 2 === 0 ? indexInWingRaw : wingSize - 1 - indexInWingRaw;
        const wingOffset = wingIndex / wings;
        const wingPhase = (phase * effect.rate + wingOffset) % 1;
        const activeIndex = Math.floor(wingPhase * wingSize);
        const reverseIndex = wingSize - 1 - activeIndex;
        const chaseIndex = effect.direction === "reverse" ? reverseIndex : activeIndex;
        const distance = Math.abs(indexInWing - chaseIndex);
        value = distance < Math.max(1, effect.width) ? 255 : 0;
        break;
      }
      case "phaser": {
        const spreadAmount = effect.phaseSpread ?? 1;
        const spreadPhase = computeSpreadPhase(
          target.fixtureIndex,
          targets.length,
          spreadAmount,
          effect.wings ?? 0,
          effect.spread ?? "linear",
        );
        const waveform = effect.waveform ?? "sine";
        const lfo01 = waveformValue(waveform, phase * effect.rate + spreadPhase);
        const lfo = lfo01 * 255;
        const base = effect.offset ?? 128;
        value = clampDmx(base + (lfo - 128) * (effect.depth / 255));
        break;
      }
      case "random_hold": {
        const periodSec = effect.rate <= 0 ? 1 : 1 / effect.rate;
        const holdIndex = Math.floor(timeSec / periodSec);
        const seed = effect.seed ?? 0;
        const random01 = hashToUnit(`${effect.id}:${target.fixtureIndex}:${holdIndex}:${seed}`);
        value = clampDmx(effect.min + random01 * (effect.max - effect.min));
        break;
      }
    }

    results.set(target.path, value);
  }

  return results;
}

export function evaluateAllEffects(
  show: ShowDocument,
  ctx: EffectEvalContext,
): Map<string, number> {
  const merged = new Map<string, number>();

  for (const effect of show.effects) {
    const values = evaluateEffect(show, effect, ctx);
    for (const [path, value] of values) {
      merged.set(path, value);
    }
  }

  return merged;
}
