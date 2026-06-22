/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useShowStore } from './show';
import { useOutputEngineStore } from './output-playback';
import type { TimecodeSource } from 'src/show/document';

import { applyTimecodeCompensation } from 'src/utils/sync-compensation';

export const DEFAULT_TIMECODE_FPS = 30;

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export const useTimecodeStore = defineStore('timecode', () => {
  const showStore = useShowStore();
  const positionSeconds = ref(0);
  const smpteHours = ref(0);
  const smpteMinutes = ref(0);
  const smpteSeconds = ref(0);
  const smpteFrames = ref(0);
  const lastUpdatedAtMs = ref<number | null>(null);
  const source = ref<TimecodeSource | 'manual' | 'unknown'>('unknown');
  const detectedFps = ref<number | null>(null);

  const enabled = computed({
    get: () => showStore.document.timecode?.enabled === true,
    set: (value: boolean) => {
      showStore.updateDocument((doc) => {
        doc.timecode = doc.timecode ?? { enabled: false, fps: DEFAULT_TIMECODE_FPS, source: 'osc' };
        doc.timecode.enabled = value;
      });
    },
  });

  const inputSource = computed({
    get: () => showStore.document.timecode?.source ?? 'osc',
    set: (value: TimecodeSource) => {
      showStore.updateDocument((doc) => {
        doc.timecode = doc.timecode ?? { enabled: false, fps: DEFAULT_TIMECODE_FPS, source: 'osc' };
        doc.timecode.source = value;
      });
    },
  });

  const fps = computed(() => {
    if (detectedFps.value && showStore.document.timecode?.source === 'ltc') {
      return Math.max(1, detectedFps.value);
    }
    const configured = showStore.document.timecode?.fps;
    if (!Number.isFinite(configured) || configured === undefined) return DEFAULT_TIMECODE_FPS;
    return Math.max(1, configured);
  });

  const smpteLabel = computed(() => {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(smpteHours.value)}:${pad(smpteMinutes.value)}:${pad(smpteSeconds.value)}:${pad(smpteFrames.value)}`;
  });

  function applySyncCompensation(seconds: number): number {
    return applyTimecodeCompensation(seconds, showStore.document.timecode);
  }

  function updateSmpteFields(seconds: number) {
    const totalFrames = Math.round(seconds * fps.value);
    const frames = totalFrames % fps.value;
    const totalSeconds = Math.floor(totalFrames / fps.value);
    smpteFrames.value = frames;
    smpteSeconds.value = totalSeconds % 60;
    smpteMinutes.value = Math.floor(totalSeconds / 60) % 60;
    smpteHours.value = Math.floor(totalSeconds / 3600);
  }

  function setDetectedFps(value: number) {
    if (!Number.isFinite(value) || value <= 0) return;
    detectedFps.value = value;
  }

  function setPositionSeconds(seconds: number, nextSource: TimecodeSource | 'manual' = 'manual') {
    const adjusted = applySyncCompensation(seconds);
    positionSeconds.value = adjusted;
    updateSmpteFields(adjusted);
    source.value = nextSource;
    lastUpdatedAtMs.value = performance.now();
    useOutputEngineStore().setExternalTimecodePosition(positionSeconds.value);
  }

  function setSmpte(
    hours: number,
    minutes: number,
    seconds: number,
    frames: number,
    nextSource: TimecodeSource | 'manual' = 'manual'
  ) {
    if (enabled.value && showStore.document.timecode?.source !== nextSource && nextSource !== 'manual') {
      return;
    }

    smpteHours.value = Math.max(0, hours);
    smpteMinutes.value = Math.max(0, minutes);
    smpteSeconds.value = Math.max(0, seconds);
    smpteFrames.value = Math.max(0, frames);

    const totalSeconds =
      smpteHours.value * 3600 +
      smpteMinutes.value * 60 +
      smpteSeconds.value +
      smpteFrames.value / fps.value;

    setPositionSeconds(totalSeconds, nextSource);
  }

  function applyOscTimecode(address: string, args: unknown[]): boolean {
    if (!enabled.value || showStore.document.timecode?.source !== 'osc') return false;
    if (address.toLowerCase() !== '/softdmx/timecode/smpte') return false;

    const numeric = args.map(toFiniteNumber).filter((value): value is number => value !== null);
    if (numeric.length === 0) return false;
    if (numeric.length === 1) {
      setPositionSeconds(numeric[0] ?? 0, 'osc');
      return true;
    }
    if (numeric.length >= 4) {
      setSmpte(numeric[0] ?? 0, numeric[1] ?? 0, numeric[2] ?? 0, numeric[3] ?? 0, 'osc');
      return true;
    }
    return false;
  }

  function applyMtcFrame(hours: number, minutes: number, seconds: number, frames: number, frameRate?: number) {
    if (!enabled.value || showStore.document.timecode?.source !== 'mtc') return;
    if (frameRate && frameRate > 0) {
      showStore.updateDocument((doc) => {
        doc.timecode = doc.timecode ?? { enabled: false, fps: DEFAULT_TIMECODE_FPS, source: 'mtc' };
        doc.timecode.fps = frameRate;
      });
    }
    setSmpte(hours, minutes, seconds, frames, 'mtc');
  }

  return {
    enabled,
    inputSource,
    fps,
    positionSeconds,
    smpteHours,
    smpteMinutes,
    smpteSeconds,
    smpteFrames,
    smpteLabel,
    lastUpdatedAtMs,
    source,
    detectedFps,
    setDetectedFps,
    setPositionSeconds,
    setSmpte,
    applyOscTimecode,
    applyMtcFrame,
  };
});
