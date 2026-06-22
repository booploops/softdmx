/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ActiveChannel, Cue, CueLayer, RecordedFrame } from 'src/types';
import type { ShowDocument } from 'src/show/document';
import { presetToChannels } from './preset-resolver';
import { clampDmx } from './types';

const easingFunctions: Record<string, (t: number) => number> = {
  linear: (t) => t,
  ease: (t) => t * t * (3.0 - 2.0 * t),
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2.0 - t),
  'ease-in-out': (t) => (t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t),
  bounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  elastic: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const p = 0.3;
    const s = p / 4;
    return -(Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * (2 * Math.PI) / p));
  },
};

function interpolateChannels(
  from: ActiveChannel[],
  to: ActiveChannel[],
  progress: number,
  easing = 'linear'
): ActiveChannel[] {
  const easingFn = easingFunctions[easing] ?? easingFunctions.linear!;
  const t = easingFn(progress);
  const toMap = new Map(to.map((ch) => [ch.path, ch]));
  const result: ActiveChannel[] = [];

  for (const fromCh of from) {
    const toCh = toMap.get(fromCh.path);
    if (toCh) {
      result.push({
        ...fromCh,
        value: clampDmx(fromCh.value + (toCh.value - fromCh.value) * t),
      });
    } else {
      result.push({ ...fromCh });
    }
  }

  for (const toCh of to) {
    if (!from.find((ch) => ch.path === toCh.path)) {
      result.push({ ...toCh, value: clampDmx(toCh.value * t) });
    }
  }

  return result;
}

function resolveFrameChannels(
  show: ShowDocument,
  frame: RecordedFrame,
  baseChannels: ActiveChannel[],
  holdChannels: ActiveChannel[]
): ActiveChannel[] {
  if (frame.type === 'delay') {
    return holdChannels.map((ch) => ({ ...ch }));
  }

  if (frame.type === 'preset' && frame.presetId) {
    const preset = show.presets.find((p) => p.id === frame.presetId);
    if (!preset) return holdChannels.map((ch) => ({ ...ch }));

    const presetMap = presetToChannels(show, preset);
    return baseChannels.map((ch) => {
      const presetVal = presetMap.get(ch.path);
      if (presetVal) {
        return { ...ch, value: presetVal.value, attributeType: presetVal.attributeType };
      }
      return { ...ch };
    });
  }

  if (frame.channels) {
    const frameMap = new Map(frame.channels.map((ch) => [ch.path, ch]));
    return baseChannels.map((ch) => {
      const frameCh = frameMap.get(ch.path);
      return frameCh ? { ...ch, value: frameCh.value } : { ...ch };
    });
  }

  return holdChannels.map((ch) => ({ ...ch }));
}

function blendLayerOutputs(
  outputs: { channels: ActiveChannel[]; opacity: number; blendMode: string }[]
): ActiveChannel[] {
  if (outputs.length === 0) return [];
  if (outputs.length === 1) return outputs[0]!.channels;

  let result = outputs[0]!.channels.map((ch) => ({ ...ch }));

  for (let i = 1; i < outputs.length; i++) {
    const layer = outputs[i]!;
    const map = new Map(result.map((ch) => [ch.path, ch]));

    for (const layerCh of layer.channels) {
      const existing = map.get(layerCh.path);
      const layerValue = layerCh.value * layer.opacity;

      if (existing) {
        switch (layer.blendMode) {
          case 'add':
            existing.value = clampDmx(existing.value + layerValue);
            break;
          case 'multiply':
            existing.value = clampDmx((existing.value * layerValue) / 255);
            break;
          case 'screen':
            existing.value = clampDmx(255 - ((255 - existing.value) * (255 - layerValue)) / 255);
            break;
          default:
            existing.value = clampDmx(existing.value * (1 - layer.opacity) + layerValue);
        }
      } else {
        result.push({ ...layerCh, value: clampDmx(layerValue) });
      }
    }
  }

  return result;
}

function evaluateLayerAtTime(
  show: ShowDocument,
  layer: CueLayer,
  timeMs: number,
  baseChannels: ActiveChannel[]
): ActiveChannel[] {
  if (layer.frames.length === 0) return baseChannels.map((ch) => ({ ...ch }));

  let currentTime = 0;
  let holdChannels = baseChannels.map((ch) => ({ ...ch }));

  for (let i = 0; i < layer.frames.length; i++) {
    const frame = layer.frames[i]!;
    const duration = frame.duration ?? 1000;
    const frameChannels = resolveFrameChannels(show, frame, baseChannels, holdChannels);

    if (timeMs >= currentTime && timeMs < currentTime + duration) {
      if (i === layer.frames.length - 1) {
        return frameChannels;
      }

      const nextFrame = layer.frames[i + 1]!;
      const nextChannels = resolveFrameChannels(show, nextFrame, baseChannels, frameChannels);
      const progress = (timeMs - currentTime) / duration;

      return interpolateChannels(frameChannels, nextChannels, progress, frame.easing ?? 'linear');
    }

    holdChannels = frameChannels.map((ch) => ({ ...ch }));

    currentTime += duration;
  }

  const lastFrame = layer.frames[layer.frames.length - 1]!;
  return resolveFrameChannels(show, lastFrame, baseChannels, holdChannels);
}

export function evaluateTimelineCueAtTime(
  show: ShowDocument,
  cue: Cue,
  timeMs: number,
  baseChannels: ActiveChannel[]
): ActiveChannel[] {
  const layers = cue.layers ?? [];
  const enabledLayers = layers.filter((l) => l.enabled && !l.solo);
  const soloLayers = layers.filter((l) => l.solo);
  const layersToProcess = soloLayers.length > 0 ? soloLayers : enabledLayers;

  if (layersToProcess.every((l) => l.frames.length === 0)) {
    return baseChannels.map((ch) => ({ ...ch }));
  }

  const layerOutputs = layersToProcess.map((layer) => ({
    channels: evaluateLayerAtTime(show, layer, timeMs, baseChannels),
    opacity: layer.opacity,
    blendMode: layer.blendMode,
  }));

  return blendLayerOutputs(layerOutputs);
}

export function getCueTotalDuration(cue: Cue): number {
  if (cue.view === 'stack' && cue.stack?.length) {
    return cue.stack.reduce((acc, step) => acc + step.fadeIn + (step.followTime ?? 0), 0);
  }

  const layers = cue.layers ?? [];
  if (layers.length === 0) return 0;

  return Math.max(
    ...layers.map((layer) =>
      layer.frames.reduce((acc, frame) => acc + (frame.duration ?? 1000), 0)
    ),
    0
  );
}
