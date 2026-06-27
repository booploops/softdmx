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
import type { ShowDocument } from '@softdmx/engine';
import { detectTimelineConflicts } from 'src/utils/timeline-conflicts';

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
  const timelineTracks = computed(() => timelineConfig.value?.tracks ?? []);
  const cueTimelineTrack = computed(
    () => timelineTracks.value.find((track) => track.kind === 'cue' && track.enabled !== false) ?? null
  );
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
          snapEnabled: true,
          snapMode: 'seconds',
          snapStep: 1,
          snapToMarkers: false,
          snapToAudioTransients: false,
          showConflictDiagnostics: true,
          showMarkers: true,
          showSections: true,
          tracks: [],
          markers: [],
          sections: [],
        };
        doc.timeline.syncMode = mode;
      });
    },
  });

  const durationMs = computed(() =>
    computeSetTimelineDurationMs(showStore.document.cues, timelineConfig.value)
  );

  const timelineCues = computed(() => {
    const cues = showStore.document.cues.filter((cue) => cue.view === 'timeline');
    const cueTrack = cueTimelineTrack.value;
    if (!cueTrack || cueTrack.clips.length === 0) return cues;
    const byId = new Map(cues.map((cue) => [cue.id, cue]));
    const ordered = cueTrack.clips
      .map((clip) => (clip.cueId ? byId.get(clip.cueId) : undefined))
      .filter((cue): cue is NonNullable<typeof cue> => Boolean(cue));
    if (ordered.length === 0) return cues;
    return ordered;
  });

  const conflictDiagnostics = computed(() =>
    detectTimelineConflicts(timelineTracks.value)
  );
  const markers = computed(() => timelineConfig.value?.markers ?? []);
  const sections = computed(() => timelineConfig.value?.sections ?? []);

  function quantizeSeconds(input: number): number {
    const safe = Math.max(0, input);
    const config = timelineConfig.value;
    if (!config?.snapEnabled) return safe;
    const step = Math.max(0.001, config.snapStep ?? 1);
    const mode = config.snapMode ?? 'seconds';
    if (mode === 'frames') {
      const frameDur = 1 / Math.max(1, fps.value);
      const frameQuantized = Math.round(safe / frameDur) * frameDur;
      return maybeSnapToMarker(frameQuantized, frameDur);
    }
    if (mode === 'beats') {
      const bpm = Math.max(1, showStore.document.audio?.bpm ?? 120);
      const beatSec = 60 / bpm;
      const beatStep = Math.max(0.001, beatSec * step);
      const beatQuantized = Math.round(safe / beatStep) * beatStep;
      return maybeSnapToMarker(beatQuantized, beatStep);
    }
    const secondQuantized = Math.round(safe / step) * step;
    return maybeSnapToMarker(secondQuantized, step);
  }

  function maybeSnapToMarker(base: number, thresholdSec: number): number {
    if (!timelineConfig.value?.snapToMarkers) return base;
    const list = markers.value;
    if (list.length === 0) return base;
    let closest = base;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const marker of list) {
      const delta = Math.abs(marker.timeSec - base);
      if (delta < bestDelta) {
        bestDelta = delta;
        closest = marker.timeSec;
      }
    }
    return bestDelta <= Math.max(0.05, thresholdSec / 2) ? closest : base;
  }

  function ensureCueTrack(doc = showStore.document): string {
    const timeline = doc.timeline;
    if (!timeline) return 'timeline-main-track';
    timeline.tracks = timeline.tracks ?? [];
    const existing = timeline.tracks.find((track) => track.kind === 'cue');
    if (existing) return existing.id;
    const trackId = 'timeline-main-track';
    timeline.tracks.push({
      id: trackId,
      name: 'Main',
      kind: 'cue',
      order: 0,
      enabled: true,
      solo: false,
      clips: [],
    });
    return trackId;
  }

  function upsertCueClip(doc: ShowDocument, cueId: string, inSec: number, outSec: number) {
    doc.timeline = doc.timeline ?? {
      durationMs: 300_000,
      fps: 30,
      syncMode: 'free',
      snapEnabled: true,
      snapMode: 'seconds',
      snapStep: 1,
      snapToMarkers: false,
      snapToAudioTransients: false,
      showConflictDiagnostics: true,
      showMarkers: true,
      showSections: true,
      primaryAudioAssetId: null,
      audioAssets: [],
      tracks: [],
      markers: [],
      sections: [],
    };
    const trackId = ensureCueTrack(doc);
    const track = doc.timeline.tracks?.find((entry) => entry.id === trackId);
    if (!track) return;
    const cue = doc.cues.find((entry) => entry.id === cueId);
    const cueName = cue?.name ?? cueId;
    const existingClip = track.clips.find((clip) => clip.cueId === cueId);
    if (existingClip) {
      existingClip.name = cueName;
      existingClip.startSec = inSec;
      existingClip.endSec = outSec;
      return;
    }
    track.clips.push({
      id: `timeline-clip-${cueId}`,
      name: cueName,
      startSec: inSec,
      endSec: outSec,
      cueId,
    });
  }

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
    setPlayheadMs(secondsToMs(quantizeSeconds(msToSeconds(nextMs))));
    if (wasPlaying) play();
  }

  function assignCueTimecodeIn(cueId: string, timecodeSeconds: number) {
    showStore.updateDocument((doc) => {
      const cue = doc.cues.find((entry) => entry.id === cueId);
      if (!cue) return;
      cue.timecodeIn = quantizeSeconds(timecodeSeconds);
      if (cue.timecodeOut !== undefined && cue.timecodeOut < cue.timecodeIn) {
        cue.timecodeOut = cue.timecodeIn + Math.max(1, cue.totalDuration) / 1000;
      }
      upsertCueClip(doc, cue.id, cue.timecodeIn, cue.timecodeOut ?? cue.timecodeIn);
      cue.modified = new Date().toISOString();
    });
  }

  function assignCueTimecodeOut(cueId: string, timecodeSeconds: number) {
    showStore.updateDocument((doc) => {
      const cue = doc.cues.find((entry) => entry.id === cueId);
      if (!cue) return;
      cue.timecodeOut = Math.max(cue.timecodeIn ?? 0, quantizeSeconds(timecodeSeconds));
      upsertCueClip(doc, cue.id, cue.timecodeIn ?? 0, cue.timecodeOut);
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
      const inSec = quantizeSeconds(0);
      const outSec = quantizeSeconds(1);
      upsertCueClip(doc, id, inSec, outSec);
    });
    selectedCueId.value = id;
    return id;
  }

  function addMarker(name: string, timeSec: number) {
    showStore.updateDocument((doc) => {
      doc.timeline = doc.timeline ?? {
        durationMs: 300_000,
        fps: 30,
        syncMode: 'free',
        snapEnabled: true,
        snapMode: 'seconds',
        snapStep: 1,
        snapToMarkers: false,
        snapToAudioTransients: false,
        showConflictDiagnostics: true,
        showMarkers: true,
        showSections: true,
        primaryAudioAssetId: null,
        audioAssets: [],
        tracks: [],
        markers: [],
        sections: [],
      };
      doc.timeline.markers = doc.timeline.markers ?? [];
      doc.timeline.markers.push({
        id: `marker-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        timeSec: quantizeSeconds(timeSec),
      });
    });
  }

  function addSection(name: string, startSec: number, endSec: number) {
    showStore.updateDocument((doc) => {
      doc.timeline = doc.timeline ?? {
        durationMs: 300_000,
        fps: 30,
        syncMode: 'free',
        snapEnabled: true,
        snapMode: 'seconds',
        snapStep: 1,
        snapToMarkers: false,
        snapToAudioTransients: false,
        showConflictDiagnostics: true,
        showMarkers: true,
        showSections: true,
        primaryAudioAssetId: null,
        audioAssets: [],
        tracks: [],
        markers: [],
        sections: [],
      };
      doc.timeline.sections = doc.timeline.sections ?? [];
      const safeStart = quantizeSeconds(Math.min(startSec, endSec));
      const safeEnd = quantizeSeconds(Math.max(startSec, endSec));
      doc.timeline.sections.push({
        id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        startSec: safeStart,
        endSec: safeEnd,
      });
    });
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
    timelineTracks,
    markers,
    sections,
    conflictDiagnostics,
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
    addMarker,
    addSection,
    syncPlayheadFromTimecode,
    stopPlaybackLoop,
  };
});
