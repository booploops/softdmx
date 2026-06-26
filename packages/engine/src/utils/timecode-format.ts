/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export type SmpteParts = {
  hours: number;
  minutes: number;
  seconds: number;
  frames: number;
};

export function normalizeFps(fps: number | undefined): number {
  if (!Number.isFinite(fps) || fps === undefined || fps <= 0) return 30;
  return Math.max(1, fps);
}

export function secondsToSmpte(seconds: number, fps = 30): SmpteParts {
  const safeFps = normalizeFps(fps);
  const safeSeconds = Math.max(0, seconds);
  const totalFrames = Math.round(safeSeconds * safeFps);
  const frames = totalFrames % safeFps;
  const totalSeconds = Math.floor(totalFrames / safeFps);

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    frames,
  };
}

export function smpteToSeconds(parts: SmpteParts, fps = 30): number {
  const safeFps = normalizeFps(fps);
  return (
    Math.max(0, parts.hours) * 3600 +
    Math.max(0, parts.minutes) * 60 +
    Math.max(0, parts.seconds) +
    Math.max(0, parts.frames) / safeFps
  );
}

export function formatSmpte(seconds: number, fps = 30): string {
  const parts = secondsToSmpte(seconds, fps);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}:${pad(parts.frames)}`;
}

export function formatTimelineSeconds(seconds: number): string {
  const safe = Math.max(0, seconds);
  const whole = Math.floor(safe);
  const millis = Math.round((safe - whole) * 1000);
  const minutes = Math.floor(whole / 60);
  const secs = whole % 60;
  if (minutes > 0) {
    return `${minutes}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
  }
  return `${secs}.${String(millis).padStart(3, "0")}s`;
}

export function parseSmpteInput(value: string, fps = 30): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(":").map((part) => Number(part.trim()));
  if (parts.some((part) => !Number.isFinite(part))) return null;

  if (parts.length === 1) return Math.max(0, parts[0] ?? 0);
  if (parts.length === 2) {
    return smpteToSeconds(
      { hours: 0, minutes: parts[0] ?? 0, seconds: parts[1] ?? 0, frames: 0 },
      fps,
    );
  }
  if (parts.length === 3) {
    return smpteToSeconds(
      { hours: 0, minutes: parts[0] ?? 0, seconds: parts[1] ?? 0, frames: parts[2] ?? 0 },
      fps,
    );
  }

  return smpteToSeconds(
    {
      hours: parts[0] ?? 0,
      minutes: parts[1] ?? 0,
      seconds: parts[2] ?? 0,
      frames: parts[3] ?? 0,
    },
    fps,
  );
}

export function msToSeconds(ms: number): number {
  return Math.max(0, ms) / 1000;
}

export function secondsToMs(seconds: number): number {
  return Math.max(0, seconds) * 1000;
}
