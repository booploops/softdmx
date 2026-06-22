/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { PixelMapDefinition, VideoSampleRegion } from '../types/show-document.ts';
import type { PixelColor } from './pixel-mapper.ts';
import { FULL_VIDEO_SAMPLE_REGION } from '../utils/video-defaults.ts';

export interface RgbaFrame {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

export function resolveSampleRegion(map: PixelMapDefinition): VideoSampleRegion {
  return map.sampleRegion ?? FULL_VIDEO_SAMPLE_REGION;
}

/** Downscale + crop source frame to pixel map grid (RGBA in map buffer). */
export function sampleFrameToPixelGrid(
  frame: RgbaFrame,
  map: PixelMapDefinition,
  flipY = false
): PixelColor[][] {
  const region = resolveSampleRegion(map);
  const grid: PixelColor[][] = Array.from({ length: map.height }, () =>
    Array.from({ length: map.width }, () => ({ r: 0, g: 0, b: 0 }))
  );

  for (let py = 0; py < map.height; py += 1) {
    for (let px = 0; px < map.width; px += 1) {
      const u = region.x + ((px + 0.5) / map.width) * region.width;
      const v = region.y + ((py + 0.5) / map.height) * region.height;
      const srcX = Math.min(frame.width - 1, Math.max(0, Math.floor(u * frame.width)));
      const srcYRaw = Math.min(frame.height - 1, Math.max(0, Math.floor(v * frame.height)));
      const srcY = flipY ? frame.height - 1 - srcYRaw : srcYRaw;
      const offset = (srcY * frame.width + srcX) * 4;
      grid[py]![px] = {
        r: frame.data[offset] ?? 0,
        g: frame.data[offset + 1] ?? 0,
        b: frame.data[offset + 2] ?? 0,
      };
    }
  }

  return grid;
}

/** Sample from pre-scaled RGB buffer (width/height = map dimensions). */
export function sampleRgbGridBuffer(
  rgb: Uint8Array,
  mapWidth: number,
  mapHeight: number
): PixelColor[][] {
  const grid: PixelColor[][] = Array.from({ length: mapHeight }, () =>
    Array.from({ length: mapWidth }, () => ({ r: 0, g: 0, b: 0 }))
  );

  for (let y = 0; y < mapHeight; y += 1) {
    for (let x = 0; x < mapWidth; x += 1) {
      const offset = (y * mapWidth + x) * 3;
      grid[y]![x] = {
        r: rgb[offset] ?? 0,
        g: rgb[offset + 1] ?? 0,
        b: rgb[offset + 2] ?? 0,
      };
    }
  }

  return grid;
}

export function readCanvasFrame(canvas: HTMLCanvasElement): RgbaFrame | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const { width, height } = canvas;
  if (width <= 0 || height <= 0) return null;
  return {
    width,
    height,
    data: ctx.getImageData(0, 0, width, height).data,
  };
}

export function drawVideoToMapCanvas(
  video: CanvasImageSource,
  canvas: HTMLCanvasElement,
  map: PixelMapDefinition,
  sourceWidth: number,
  sourceHeight: number,
  flipY = false
): RgbaFrame | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  canvas.width = map.width;
  canvas.height = map.height;

  const region = resolveSampleRegion(map);
  const sx = region.x * sourceWidth;
  const sy = region.y * sourceHeight;
  const sw = region.width * sourceWidth;
  const sh = region.height * sourceHeight;

  ctx.save();
  if (flipY) {
    ctx.translate(0, map.height);
    ctx.scale(1, -1);
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, map.width, map.height);
  ctx.restore();

  return readCanvasFrame(canvas);
}
