/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type {
  ShowVideoConfig,
  VideoInputKind,
  VideoSampleFps,
  VideoSampleRegion,
} from '../types/show-document.ts';

export const FULL_VIDEO_SAMPLE_REGION: VideoSampleRegion = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

export function createDefaultVideoConfig(): ShowVideoConfig {
  return {
    enabled: false,
    pixelMapIds: [],
    inputKind: 'none',
    deviceId: null,
    senderName: null,
    gain: 1,
    smoothingMs: 80,
    blackLevel: 0,
    followDimmer: false,
    fps: 30,
  };
}

export function normalizeVideoInputKind(value: unknown): VideoInputKind {
  if (value === 'webcam' || value === 'syphon' || value === 'spout') return value;
  return 'none';
}

export function normalizeSampleRegion(value: Partial<VideoSampleRegion> | undefined): VideoSampleRegion {
  const x = clamp01(value?.x ?? 0);
  const y = clamp01(value?.y ?? 0);
  const width = clamp01(value?.width ?? 1);
  const height = clamp01(value?.height ?? 1);
  const safeWidth = Math.max(0.001, Math.min(width, 1 - x));
  const safeHeight = Math.max(0.001, Math.min(height, 1 - y));
  return { x, y, width: safeWidth, height: safeHeight };
}

export function normalizeVideoFps(value: unknown): VideoSampleFps {
  if (value === 15 || value === 24 || value === 30 || value === 44 || value === 60) return value;
  return 30;
}

/** Active pixel maps for video sampling (supports legacy single pixelMapId). */
export function resolveVideoPixelMapIds(video: ShowVideoConfig | undefined): string[] {
  if (!video) return [];
  if (Array.isArray(video.pixelMapIds)) {
    return video.pixelMapIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
  }
  if (typeof video.pixelMapId === 'string' && video.pixelMapId.length > 0) {
    return [video.pixelMapId];
  }
  return [];
}

export function resolvePixelMapVideoGain(
  map: { videoGain?: number },
  video?: ShowVideoConfig
): number {
  if (typeof map.videoGain === 'number' && Number.isFinite(map.videoGain)) {
    return Math.max(0, Math.min(2, map.videoGain));
  }
  if (typeof video?.gain === 'number' && Number.isFinite(video.gain)) {
    return Math.max(0, Math.min(2, video.gain));
  }
  return 1;
}

export function resolvePixelMapVideoSmoothingMs(
  map: { videoSmoothingMs?: number },
  video?: ShowVideoConfig
): number {
  if (typeof map.videoSmoothingMs === 'number' && Number.isFinite(map.videoSmoothingMs)) {
    return Math.max(0, map.videoSmoothingMs);
  }
  if (typeof video?.smoothingMs === 'number' && Number.isFinite(video.smoothingMs)) {
    return Math.max(0, video.smoothingMs);
  }
  return 80;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
