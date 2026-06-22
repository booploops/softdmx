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
import { useTimecodeStore } from './timecode';
import { useOutputEngineStore } from './output-playback';
import { computeSetTimelineDurationMs } from '@softdmx/engine';
import { msToSeconds, secondsToMs } from '@softdmx/engine';

export const useTimelineEditorStore = defineStore('timeline-editor', () => {
  const showStore = useShowStore();
  const timecodeStore = useTimecodeStore();
  const outputEngine = useOutputEngineStore();

  const playheadMs = ref(0);
  const isPlaying = ref(false);
  const pixelsPerSecond = ref(120);
  const scrollLeftPx = ref(0);
  const selectedCueId = ref<string | null>(null);
  const previewEnabled = ref(false);

  let playbackStartMs = 0;
  let playbackOriginMs = 0;
  let playbackRafId: number | null = null;

  const timelineConfig = computed(() => showStore.document.timeline);
  const fps = computed(() => timelineConfig.value?.fps ?? timecodeStore.fps ?? 30);
  const syncMode = computed({
    get: () => timelineConfig.value?.syncMode ?? 'free',
    set: (mode: 'free' | 'timecode') => {
      showStore.updateDocument((doc) => {
        doc.timeline = doc.timeline ?? {
          durationMs: 300_000,
          fps: 30,
          syncMode: 'free',
          primaryAudioAssetId: null,
          audioAssets: [],
        };
        doc.timeline.syncMode = mode;
      });
    },
  });

  const durationMs = computed(() =>
    computeSetTimelineDurationMs(showStore.document.cues, timelineConfig.value)
  );

  const timelineCues = computed(() =>
    showStore.document.cues.filter((cue) => cue.view === 'timeline')
  );

  function setPlayheadMs(nextMs: number, options?: { preview?: boolean }) {
    playheadMs.value = Math.max(0, Math.min(durationMs.value, nextMs));
    if (options?.preview !== false && previewEnabled.value) {
      outputEngine.setTimelinePreviewPosition(msToSeconds(playheadMs.value));
    }
  }

  function setSelectedCue(cueId: string | null) {
    selectedCueId.value = cueId;
  }

  function setPreviewEnabled(enabled: boolean) {
    previewEnabled.value = enabled;
    if (!enabled) {
      outputEngine.setTimelinePreviewPosition(null);
      return;
    }
    outputEngine.setTimelinePreviewPosition(msToSeconds(playheadMs.value));
    outputEngine.ensureTick();
  }

  function stopPlaybackLoop() {
    if (playbackRafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(playbackRafId);
    }
    playbackRafId = null;
    isPlaying.value = false;
  }

  function playbackLoop(timestamp: number) {
    if (!isPlaying.value) return;

    const elapsedMs = timestamp - playbackStartMs;
    const nextMs = playbackOriginMs + elapsedMs;

    if (nextMs >= durationMs.value) {
      setPlayheadMs(durationMs.value);
      stopPlaybackLoop();
      return;
    }

    setPlayheadMs(nextMs);
    playbackRafId = window.requestAnimationFrame(playbackLoop);
  }

  function play() {
    if (syncMode.value === 'timecode' && timecodeStore.enabled) {
      setPlayheadMs(secondsToMs(timecodeStore.positionSeconds));
      isPlaying.value = true;
      return;
    }

    playbackOriginMs = playheadMs.value;
    playbackStartMs = performance.now();
    isPlaying.value = true;
    previewEnabled.value = true;
    outputEngine.setTimelinePreviewPosition(msToSeconds(playheadMs.value));
    outputEngine.ensureTick();
    playbackRafId = window.requestAnimationFrame(playbackLoop);
  }

  function pause() {
    stopPlaybackLoop();
  }

  function stop() {
    stopPlaybackLoop();
    setPlayheadMs(0);
  }

  function seekToMs(nextMs: number) {
    const wasPlaying = isPlaying.value;
    stopPlaybackLoop();
    setPlayheadMs(nextMs);
    if (wasPlaying) play();
  }

  function assignCueTimecodeIn(cueId: string, timecodeSeconds: number) {
    showStore.updateDocument((doc) => {
      const cue = doc.cues.find((entry) => entry.id === cueId);
      if (!cue) return;
      cue.timecodeIn = Math.max(0, timecodeSeconds);
      if (cue.timecodeOut !== undefined && cue.timecodeOut < cue.timecodeIn) {
        cue.timecodeOut = cue.timecodeIn + Math.max(1, cue.totalDuration) / 1000;
      }
      cue.modified = new Date().toISOString();
    });
  }

  function assignCueTimecodeOut(cueId: string, timecodeSeconds: number) {
    showStore.updateDocument((doc) => {
      const cue = doc.cues.find((entry) => entry.id === cueId);
      if (!cue) return;
      cue.timecodeOut = Math.max(cue.timecodeIn ?? 0, timecodeSeconds);
      cue.modified = new Date().toISOString();
    });
  }

  function ensureTimelineCue(name = 'Timeline Cue') {
    const existing = timelineCues.value[0];
    if (existing) {
      selectedCueId.value = existing.id;
      return existing.id;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    showStore.updateDocument((doc) => {
      doc.cues.push({
        id,
        name,
        view: 'timeline',
        layers: [
          {
            id: `${id}-layer`,
            name: `${name} - Main`,
            frames: [],
            enabled: true,
            opacity: 1,
            blendMode: 'replace',
            solo: false,
          },
        ],
        stack: [],
        totalDuration: 0,
        isLooping: false,
        fadeInDuration: 0,
        fadeOutDuration: 0,
        priority: 1,
        tags: [],
        timecodeIn: 0,
        created: now,
        modified: now,
      });
    });
    selectedCueId.value = id;
    return id;
  }

  function syncPlayheadFromTimecode() {
    if (syncMode.value !== 'timecode' || !timecodeStore.enabled) return;
    setPlayheadMs(secondsToMs(timecodeStore.positionSeconds), { preview: false });
  }

  return {
    playheadMs,
    isPlaying,
    pixelsPerSecond,
    scrollLeftPx,
    selectedCueId,
    previewEnabled,
    timelineConfig,
    fps,
    syncMode,
    durationMs,
    timelineCues,
    setPlayheadMs,
    setSelectedCue,
    setPreviewEnabled,
    play,
    pause,
    stop,
    seekToMs,
    assignCueTimecodeIn,
    assignCueTimecodeOut,
    ensureTimelineCue,
    syncPlayheadFromTimecode,
    stopPlaybackLoop,
  };
});
