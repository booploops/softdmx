/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  getFeatureFlagDefaults,
  resolveFeatureFlagProfile,
  type FeatureFlagSnapshot,
} from "./feature-flags-schema";

const RUNTIME_FLAG_KEYS = [
  "mergeWorkerEnabled",
  "mergeWasmEnabled",
  "showParseWorkerEnabled",
  "audioAnalysisWorkerEnabled",
  "ltcDecodeWorkerEnabled",
  "timelineAudioWorkerEnabled",
] as const;

export type RuntimeOptimizationFlags = Pick<FeatureFlagSnapshot, (typeof RUNTIME_FLAG_KEYS)[number]>;

const STORAGE_KEY = "softdmx.runtime_optimization_flags";

function buildDefaultRuntimeFlags(): RuntimeOptimizationFlags {
  const profile = resolveFeatureFlagProfile(
    typeof import.meta !== "undefined" ? (import.meta as { env?: { MODE?: string } }).env?.MODE : undefined,
  );
  const defaults = getFeatureFlagDefaults(profile);
  return {
    mergeWorkerEnabled: defaults.mergeWorkerEnabled,
    mergeWasmEnabled: defaults.mergeWasmEnabled,
    showParseWorkerEnabled: defaults.showParseWorkerEnabled,
    audioAnalysisWorkerEnabled: defaults.audioAnalysisWorkerEnabled,
    ltcDecodeWorkerEnabled: defaults.ltcDecodeWorkerEnabled,
    timelineAudioWorkerEnabled: defaults.timelineAudioWorkerEnabled,
  };
}

const DEFAULT_FLAGS = buildDefaultRuntimeFlags();

function parseJson(value: string | null): Partial<RuntimeOptimizationFlags> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Partial<RuntimeOptimizationFlags>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getRuntimeOptimizationFlags(): RuntimeOptimizationFlags {
  if (typeof window === "undefined") {
    return { ...DEFAULT_FLAGS };
  }
  const overrides = parseJson(window.localStorage.getItem(STORAGE_KEY));
  return {
    ...DEFAULT_FLAGS,
    ...overrides,
  };
}

export function updateRuntimeOptimizationFlags(
  patch: Partial<RuntimeOptimizationFlags>,
): RuntimeOptimizationFlags {
  const next = {
    ...getRuntimeOptimizationFlags(),
    ...patch,
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function resetRuntimeOptimizationFlags(): RuntimeOptimizationFlags {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return { ...DEFAULT_FLAGS };
}

export function getDefaultRuntimeOptimizationFlags(): RuntimeOptimizationFlags {
  return { ...DEFAULT_FLAGS };
}
