/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { PixelMapDefinition } from 'src/show/document';

type PixelComponent = 'r' | 'g' | 'b';

export interface PixelColor {
  r: number;
  g: number;
  b: number;
}

export interface MappedChannelValue {
  fixtureName: string;
  channel: number;
  path: string;
  value: number;
}

export function flattenPixelMatrixToChannels(
  pixelMap: PixelMapDefinition,
  pixels: PixelColor[][]
): MappedChannelValue[] {
  const channelOrder = parseChannelOrder(pixelMap.channelOrder);
  const flattened: MappedChannelValue[] = [];

  for (const cell of pixelMap.fixtureChannels) {
    if (cell.x < 0 || cell.x >= pixelMap.width || cell.y < 0 || cell.y >= pixelMap.height) {
      continue;
    }

    const pixel = pixels[cell.y]?.[cell.x];
    if (!pixel) continue;

    channelOrder.forEach((component, componentIndex) => {
      const value = clampDmx(pixel[component]);
      const channel = cell.startChannel + componentIndex;
      flattened.push({
        fixtureName: cell.fixtureName,
        channel,
        path: `show://${cell.fixtureName}/${channel}`,
        value,
      });
    });
  }

  return flattened;
}

function parseChannelOrder(order: PixelMapDefinition['channelOrder']): PixelComponent[] {
  switch (order) {
    case 'rbg':
      return ['r', 'b', 'g'];
    case 'grb':
      return ['g', 'r', 'b'];
    case 'gbr':
      return ['g', 'b', 'r'];
    case 'brg':
      return ['b', 'r', 'g'];
    case 'bgr':
      return ['b', 'g', 'r'];
    case 'rgb':
    default:
      return ['r', 'g', 'b'];
  }
}

function clampDmx(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(value)));
}

