/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ActiveChannel } from 'src/types';

export interface ChannelValue {
  path: string;
  value: number;
  attributeType: string;
  priority: number;
  source: 'scratch' | 'cue' | 'effect' | 'audio' | 'video' | 'base';
}

export interface LayerContribution {
  source: 'scratch' | 'cue' | 'effect' | 'audio' | 'video' | 'base';
  priority: number;
  channels: Map<string, ChannelValue>;
}

export interface MergeOptions {
  grandMaster: number;
  blackout: boolean;
}

export interface ChannelMeta {
  path: string;
  id: number;
  universe?: string;
  attributeType: string;
  defaultValue: number;
}

export function clampDmx(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function isHtpAttribute(type: string): boolean {
  return type === 'intensity' || type === 'color';
}

/** Intensity masters (GM, playback bus, group subs) affect dimmer/color only — not pan/tilt. */
export function scalesWithIntensityMaster(type: string): boolean {
  return type === 'intensity' || type === 'color';
}

export function mergeLayers(
  baseChannels: ActiveChannel[],
  layers: LayerContribution[],
  options: MergeOptions
): ActiveChannel[] {
  if (options.blackout) {
    return baseChannels.map((ch) => ({ ...ch, value: 0 }));
  }

  const resultMap = new Map<string, ActiveChannel>();
  for (const ch of baseChannels) {
    resultMap.set(ch.path, { ...ch });
  }

  const sortedLayers = [...layers].sort((a, b) => a.priority - b.priority);

  for (const layer of sortedLayers) {
    for (const [path, channelValue] of layer.channels) {
      const existing = resultMap.get(path);
      if (!existing) {
        resultMap.set(path, {
          id: 0,
          path,
          value: channelValue.value,
          attributeType: channelValue.attributeType,
        });
        continue;
      }

      const scratchOverride = channelValue.source === 'scratch';

      if (isHtpAttribute(channelValue.attributeType) && !scratchOverride) {
        existing.value = clampDmx(Math.max(existing.value, channelValue.value));
      } else {
        existing.value = clampDmx(channelValue.value);
      }
    }
  }

  const grandMaster = options.grandMaster;
  return Array.from(resultMap.values()).map((ch) => {
    const attributeType = ch.attributeType ?? 'generic';
    return {
      ...ch,
      value: scalesWithIntensityMaster(attributeType)
        ? clampDmx(ch.value * grandMaster)
        : ch.value,
    };
  });
}
