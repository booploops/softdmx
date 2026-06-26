/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ShowLinkSyncConfig, ShowOscSyncConfig, ShowTimecodeConfig } from "../show/document";

export function normalizeLatencyMs(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) return 0;
  return Math.max(0, value);
}

export function normalizeSignedOffsetMs(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) return 0;
  return value;
}

export function normalizePhaseOffsetBeats(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) return 0;
  return value;
}

export function applyTimecodeCompensation(
  seconds: number,
  config?: Pick<ShowTimecodeConfig, "latencyMs" | "globalOffsetMs">,
): number {
  const latencySec = normalizeLatencyMs(config?.latencyMs) / 1000;
  const offsetSec = normalizeSignedOffsetMs(config?.globalOffsetMs) / 1000;
  return Math.max(0, seconds - latencySec + offsetSec);
}

export function applyOscMediaCompensation(
  seconds: number,
  config?: Pick<ShowOscSyncConfig, "mediaLatencyMs" | "mediaOffsetMs">,
): number {
  const latencySec = normalizeLatencyMs(config?.mediaLatencyMs) / 1000;
  const offsetSec = normalizeSignedOffsetMs(config?.mediaOffsetMs) / 1000;
  return Math.max(0, seconds - latencySec + offsetSec);
}

export function compensateLinkPhase(
  beat: number,
  phase: number,
  bpm: number,
  config?: Pick<ShowLinkSyncConfig, "outputLatencyMs" | "phaseOffset">,
): number {
  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  const latencyBeats = (normalizeLatencyMs(config?.outputLatencyMs) / 1000) * (safeBpm / 60);
  const offsetBeats = normalizePhaseOffsetBeats(config?.phaseOffset);
  const totalBeats = beat + phase - latencyBeats + offsetBeats;
  return ((totalBeats % 1) + 1) % 1;
}

export function compensateLinkBeat(
  beat: number,
  phase: number,
  bpm: number,
  config?: Pick<ShowLinkSyncConfig, "outputLatencyMs" | "phaseOffset">,
): number {
  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  const latencyBeats = (normalizeLatencyMs(config?.outputLatencyMs) / 1000) * (safeBpm / 60);
  const offsetBeats = normalizePhaseOffsetBeats(config?.phaseOffset);
  return beat + phase - latencyBeats + offsetBeats;
}
