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
import { useTimelineAudioStore } from './timeline-audio';
import { computeSetTimelineDurationMs } from '@softdmx/engine';
import { msToSeconds, secondsToMs } from '@softdmx/engine';
import type { ProgrammerSession, ShowDocument, TimelineClip, TimelineTrack } from '@softdmx/engine';
import { detectTimelineConflicts } from 'src/utils/timeline-conflicts';

function createDefaultTimeline() {
  return {
    durationMs: 300_000,
    fps: 30,
    syncMode: 'free' as const,
    snapEnabled: true,
    snapMode: 'seconds' as const,
    snapStep: 1,
    snapToMarkers: false,
    snapToAudioTransients: false,
    showConflictDiagnostics: true,
    showMarkers: true,
    showSections: true,
    primaryAudioAssetId: null as string | null,
    audioAssets: [] as NonNullable<ShowDocument['timeline']>['audioAssets'],
    tracks: [] as TimelineTrack[],
    markers: [] as NonNullable<ShowDocument['timeline']>['markers'],
    sections: [] as NonNullable<ShowDocument['timeline']>['sections'],
    programmerSessions: [] as ProgrammerSession[],
    sessionView: {
      rows: [{ id: 'scene-1', name: 'Scene 1' }],
      columns: [
        { id: 'col-main', name: 'Main', trackId: 'timeline-main-track' },
        { id: 'col-presets', name: 'Presets' },
      ],
      slots: [] as NonNullable<NonNullable<ShowDocument['timeline']>['sessionView']>['slots'],
    },
  };
}

export const useTimelineEditorStore = defineStore('timeline-editor', () => {
  const showStore = useShowStore();
  const timecodeStore = useTimecodeStore();
  const outputEngine = useOutputEngineStore();

  const playheadMs = ref(0);
  const isPlaying = ref(false);
  const pixelsPerSecond = ref(120);
  const scrollLeftPx = ref(0);
  const selectedCueId = ref<string | null>(null);
  const selectedCueIds = ref<string[]>([]);
  const previewEnabled = ref(false);
  const followPlayhead = ref(true);
  const operatorFilterClientId = ref<string | null>(null);

  let playbackStartMs = 0;
  let playbackOriginMs = 0;
  let playbackRafId: number | null = null;

  const timelineConfig = computed(() => showStore.document.timeline);
  const fps = computed(() => timelineConfig.value?.fps ?? timecodeStore.fps ?? 30);
  const timelineTracks = computed(() => timelineConfig.value?.tracks ?? []);
  const cueTracks = computed(() =>
    timelineTracks.value
      .filter((track) => track.kind === 'cue')
      .slice()
      .sort((a, b) => a.order - b.order)
  );
  const cueTimelineTrack = computed(
    () => cueTracks.value.find((track) => track.enabled !== false) ?? cueTracks.value[0] ?? null
  );
  const automationTrack = computed(
    () => timelineTracks.value.find((track) => track.kind === 'automation') ?? null
  );
  const programmerSessions = computed(() => timelineConfig.value?.programmerSessions ?? []);
  const automationSessionClips = computed(() => automationTrack.value?.clips ?? []);
  const sessionView = computed(() => timelineConfig.value?.sessionView ?? null);
  const sessionsByOperator = computed(() => {
    const groups = new Map<string, ProgrammerSession[]>();
    for (const session of programmerSessions.value) {
      const clientIds = new Set(
        session.events.map((event) => event.clientId).filter((clientId): clientId is string => Boolean(clientId))
      );
      if (clientIds.size === 0) {
        const existing = groups.get('all') ?? [];
        existing.push(session);
        groups.set('all', existing);
        continue;
      }
      for (const clientId of clientIds) {
        const existing = groups.get(clientId) ?? [];
        existing.push(session);
        groups.set(clientId, existing);
      }
    }
    return groups;
  });
  const syncMode = computed({
    get: () => timelineConfig.value?.syncMode ?? 'free',
    set: (mode: 'free' | 'timecode') => {
      showStore.updateDocument((doc) => {
        doc.timeline = doc.timeline ?? createDefaultTimeline();
        doc.timeline.syncMode = mode;
      });
    },
  });

  const durationMs = computed(() =>
    computeSetTimelineDurationMs(showStore.document.cues, timelineConfig.value)
  );

  const timelineCues = computed(() => {
    const cues = showStore.document.cues.filter((cue) => cue.view === 'timeline');
    const tracks = cueTracks.value.filter((track) => track.enabled !== false);
    const clips = tracks.flatMap((track) => track.clips);
    if (clips.length === 0) return cues;
    const byId = new Map(cues.map((cue) => [cue.id, cue]));
    const seen = new Set<string>();
    const ordered: typeof cues = [];
    for (const clip of clips) {
      if (!clip.cueId || seen.has(clip.cueId)) continue;
      const cue = byId.get(clip.cueId);
      if (!cue) continue;
      seen.add(clip.cueId);
      ordered.push(cue);
    }
    if (ordered.length === 0) return cues;
    return ordered;
  });

  const conflictDiagnostics = computed(() => detectTimelineConflicts(timelineTracks.value));
  const markers = computed(() => timelineConfig.value?.markers ?? []);
  const sections = computed(() => timelineConfig.value?.sections ?? []);

  function setScrollLeftPx(px: number) {
    scrollLeftPx.value = Math.max(0, px);
  }

  function setSelectedCues(cueIds: string[], primaryId?: string | null) {
    selectedCueIds.value = [...cueIds];
    selectedCueId.value = primaryId ?? cueIds[0] ?? null;
  }

  function toggleCueSelection(cueId: string) {
    const next = new Set(selectedCueIds.value);
    if (next.has(cueId)) next.delete(cueId);
    else next.add(cueId);
    setSelectedCues(Array.from(next), cueId);
  }

  function quantizeSeconds(input: number, options?: { transients?: number[] }): number {
    const safe = Math.max(0, input);
    const config = timelineConfig.value;
    if (!config?.snapEnabled) return safe;
    const step = Math.max(0.001, config.snapStep ?? 1);
    const mode = config.snapMode ?? 'seconds';
    let quantized = safe;
    let threshold = step;
    if (mode === 'frames') {
      const frameDur = 1 / Math.max(1, fps.value);
      quantized = Math.round(safe / frameDur) * frameDur;
      threshold = frameDur;
    } else if (mode === 'beats') {
      const bpm = Math.max(1, showStore.document.audio?.bpm ?? 120);
      const beatSec = 60 / bpm;
      const beatStep = Math.max(0.001, beatSec * step);
      quantized = Math.round(safe / beatStep) * beatStep;
      threshold = beatStep;
    } else {
      quantized = Math.round(safe / step) * step;
      threshold = step;
    }
    quantized = maybeSnapToMarker(quantized, threshold);
    if (config.snapToAudioTransients) {
      const transients = options?.transients ?? [];
      quantized = maybeSnapToTransient(quantized, threshold, transients);
    }
    return quantized;
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

  function maybeSnapToTransient(base: number, thresholdSec: number, transients: number[]): number {
    if (transients.length === 0) return base;
    let closest = base;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const timeSec of transients) {
      const delta = Math.abs(timeSec - base);
      if (delta < bestDelta) {
        bestDelta = delta;
        closest = timeSec;
      }
    }
    return bestDelta <= Math.max(0.05, thresholdSec / 2) ? closest : base;
  }

  function snapPreviewSeconds(input: number): number {
    let transients: number[] = [];
    try {
      transients = useTimelineAudioStore().transientMarkers;
    } catch {
      transients = [];
    }
    return quantizeSeconds(input, { transients });
  }

  function ensureAutomationTrack(doc = showStore.document): string {
    const timeline = doc.timeline ?? (doc.timeline = createDefaultTimeline());
    timeline.tracks = timeline.tracks ?? [];
    const existing = timeline.tracks.find((track) => track.kind === 'automation');
    if (existing) return existing.id;
    const trackId = 'timeline-automation-track';
    timeline.tracks.push({
      id: trackId,
      name: 'Sessions',
      kind: 'automation',
      order: 100,
      enabled: true,
      solo: false,
      clips: [],
    });
    return trackId;
  }

  function ensureCueTrack(doc = showStore.document, trackId = 'timeline-main-track'): string {
    const timeline = doc.timeline ?? (doc.timeline = createDefaultTimeline());
    timeline.tracks = timeline.tracks ?? [];
    const existing = timeline.tracks.find((track) => track.id === trackId)
      ?? timeline.tracks.find((track) => track.kind === 'cue');
    if (existing) return existing.id;
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

  function addCueTrack(name?: string): string {
    const id = `timeline-cue-track-${Date.now().toString(36)}`;
    showStore.updateDocument((doc) => {
      const timeline = doc.timeline ?? (doc.timeline = createDefaultTimeline());
      timeline.tracks = timeline.tracks ?? [];
      const cueCount = timeline.tracks.filter((track) => track.kind === 'cue').length;
      timeline.tracks.push({
        id,
        name: name || `Track ${cueCount + 1}`,
        kind: 'cue',
        order: cueCount,
        enabled: true,
        solo: false,
        clips: [],
      });
      if (timeline.sessionView) {
        timeline.sessionView.columns = timeline.sessionView.columns ?? [];
        timeline.sessionView.columns.push({
          id: `col-${id}`,
          name: name || `Track ${cueCount + 1}`,
          trackId: id,
        });
      }
    });
    return id;
  }

  function setTrackEnabled(trackId: string, enabled: boolean) {
    showStore.updateDocument((doc) => {
      const track = doc.timeline?.tracks?.find((entry) => entry.id === trackId);
      if (track) track.enabled = enabled;
    });
  }

  function setTrackSolo(trackId: string, solo: boolean) {
    showStore.updateDocument((doc) => {
      const track = doc.timeline?.tracks?.find((entry) => entry.id === trackId);
      if (track) track.solo = solo;
    });
  }

  function upsertAutomationClip(sessionId: string, options?: { clientId?: string }) {
    showStore.updateDocument((doc) => {
      const sessions = doc.timeline?.programmerSessions ?? [];
      const session = sessions.find((entry) => entry.id === sessionId);
      if (!session) return;

      let events = session.events;
      if (options?.clientId) {
        events = events.filter((event) => !event.clientId || event.clientId === options.clientId);
      }
      if (events.length === 0) return;

      const startSec = session.anchorSec + Math.min(...events.map((event) => event.tSec));
      const endSec = session.anchorSec + Math.max(...events.map((event) => event.tSec));
      const clipSuffix = options?.clientId ? `-${options.clientId}` : '';
      const clipId = `session-clip-${sessionId}${clipSuffix}`;
      const operatorLabel = options?.clientId
        ? events.find((event) => event.clientId === options.clientId)?.meta?.operatorLabel
        : undefined;
      const clipName = operatorLabel ? `${session.name} (${operatorLabel})` : session.name;

      doc.timeline = doc.timeline ?? createDefaultTimeline();
      const trackId = ensureAutomationTrack(doc);
      const track = doc.timeline.tracks?.find((entry) => entry.id === trackId);
      if (!track) return;

      const existingClip = track.clips.find((clip) => clip.id === clipId);
      const nextClip: TimelineClip = {
        id: clipId,
        name: clipName,
        startSec,
        endSec: Math.max(endSec, startSec + 0.1),
        color: events[0]?.meta?.color,
      };

      if (existingClip) Object.assign(existingClip, nextClip);
      else track.clips.push(nextClip);
    });
  }

  function upsertCueClip(
    doc: ShowDocument,
    cueId: string,
    inSec: number,
    outSec: number,
    trackId?: string
  ) {
    doc.timeline = doc.timeline ?? createDefaultTimeline();
    const resolvedTrackId = ensureCueTrack(doc, trackId);
    const track = doc.timeline.tracks?.find((entry) => entry.id === resolvedTrackId);
    if (!track) return;
    const cue = doc.cues.find((entry) => entry.id === cueId);
    const cueName = cue?.name ?? cueId;
    const existingClip = track.clips.find((clip) => clip.cueId === cueId)
      ?? doc.timeline.tracks?.flatMap((entry) => entry.clips).find((clip) => clip.cueId === cueId);
    if (existingClip) {
      // Move clip to target track if needed
      if (!track.clips.includes(existingClip)) {
        for (const other of doc.timeline.tracks ?? []) {
          other.clips = other.clips.filter((clip) => clip.id !== existingClip.id);
        }
        track.clips.push(existingClip);
      }
      existingClip.name = cueName;
      existingClip.startSec = inSec;
      existingClip.endSec = outSec;
      existingClip.cueId = cueId;
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
    if (cueId) setSelectedCues([cueId], cueId);
    else setSelectedCues([], null);
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

  /** Pause at current playhead (NLE stop). */
  function stop() {
    stopPlaybackLoop();
  }

  /** Return playhead to start. */
  function returnToStart() {
    stopPlaybackLoop();
    setPlayheadMs(0);
  }

  function seekToMs(nextMs: number) {
    const wasPlaying = isPlaying.value;
    stopPlaybackLoop();
    setPlayheadMs(secondsToMs(quantizeSeconds(msToSeconds(nextMs))));
    if (wasPlaying) play();
  }

  function assignCueTimecodeIn(cueId: string, timecodeSeconds: number, trackId?: string) {
    showStore.updateDocument((doc) => {
      const cue = doc.cues.find((entry) => entry.id === cueId);
      if (!cue) return;
      cue.timecodeIn = quantizeSeconds(timecodeSeconds);
      if (cue.timecodeOut !== undefined && cue.timecodeOut < cue.timecodeIn) {
        cue.timecodeOut = cue.timecodeIn + Math.max(1, cue.totalDuration) / 1000;
      }
      upsertCueClip(doc, cue.id, cue.timecodeIn, cue.timecodeOut ?? cue.timecodeIn + 1, trackId);
      cue.modified = new Date().toISOString();
    });
  }

  function assignCueTimecodeOut(cueId: string, timecodeSeconds: number, trackId?: string) {
    showStore.updateDocument((doc) => {
      const cue = doc.cues.find((entry) => entry.id === cueId);
      if (!cue) return;
      cue.timecodeOut = Math.max(cue.timecodeIn ?? 0, quantizeSeconds(timecodeSeconds));
      upsertCueClip(doc, cue.id, cue.timecodeIn ?? 0, cue.timecodeOut, trackId);
      cue.modified = new Date().toISOString();
    });
  }

  function ensureTimelineCue(name = 'Timeline Cue') {
    const existing = timelineCues.value[0];
    if (existing) {
      setSelectedCue(existing.id);
      return existing.id;
    }
    return createTimelineCue(name, 0, 1);
  }

  function createTimelineCue(name = 'Timeline Cue', startSec = 0, endSec?: number, trackId?: string) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    const inSec = quantizeSeconds(startSec);
    const outSec = quantizeSeconds(endSec ?? startSec + 1);
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
        totalDuration: Math.max(0, (outSec - inSec) * 1000),
        isLooping: false,
        fadeInDuration: 0,
        fadeOutDuration: 0,
        priority: 1,
        tags: [],
        timecodeIn: inSec,
        timecodeOut: outSec,
        created: now,
        modified: now,
      });
      upsertCueClip(doc, id, inSec, Math.max(outSec, inSec + 0.1), trackId);
    });
    setSelectedCue(id);
    return id;
  }

  function duplicateSelectedClips() {
    const sourceIds = selectedCueIds.value.length
      ? selectedCueIds.value
      : selectedCueId.value
        ? [selectedCueId.value]
        : [];
    if (sourceIds.length === 0) return;

    const source = timelineCues.value.filter((cue) => sourceIds.includes(cue.id));
    const createdIds: string[] = [];
    const snapStep = Math.max(0.1, timelineConfig.value?.snapStep ?? 1);

    showStore.updateDocument((doc) => {
      source.forEach((cue, index) => {
        const duplicated = structuredClone(cue);
        const newId = `${cue.id}-copy-${Date.now()}-${index}`;
        duplicated.id = newId;
        duplicated.name = `${cue.name} Copy`;
        duplicated.timecodeIn = (cue.timecodeIn ?? 0) + snapStep;
        duplicated.timecodeOut =
          cue.timecodeOut !== undefined ? cue.timecodeOut + snapStep : duplicated.timecodeIn + 1;
        duplicated.modified = new Date().toISOString();
        duplicated.created = new Date().toISOString();
        if (duplicated.layers) {
          duplicated.layers = duplicated.layers.map((layer, layerIndex) => ({
            ...layer,
            id: `${newId}-layer-${layerIndex}`,
          }));
        }
        doc.cues.push(duplicated);
        upsertCueClip(
          doc,
          newId,
          duplicated.timecodeIn ?? 0,
          duplicated.timecodeOut ?? (duplicated.timecodeIn ?? 0) + 1
        );
        createdIds.push(newId);
      });
    });
    if (createdIds.length) setSelectedCues(createdIds, createdIds[0]);
  }

  function deleteSelectedClips() {
    const sourceIds = selectedCueIds.value.length
      ? selectedCueIds.value
      : selectedCueId.value
        ? [selectedCueId.value]
        : [];
    if (sourceIds.length === 0) return;

    showStore.updateDocument((doc) => {
      for (const track of doc.timeline?.tracks ?? []) {
        if (track.kind !== 'cue') continue;
        track.clips = track.clips.filter((clip) => !clip.cueId || !sourceIds.includes(clip.cueId));
      }
      // Keep cue definitions; only remove arrangement clips. Clear TC if no remaining clips.
      for (const cueId of sourceIds) {
        const stillClipped = (doc.timeline?.tracks ?? []).some((track) =>
          track.clips.some((clip) => clip.cueId === cueId)
        );
        if (!stillClipped) {
          const cue = doc.cues.find((entry) => entry.id === cueId);
          if (cue) {
            cue.timecodeIn = undefined;
            cue.timecodeOut = undefined;
          }
        }
      }
    });
    setSelectedCues([], null);
  }

  function addMarker(name: string, timeSec: number) {
    showStore.updateDocument((doc) => {
      doc.timeline = doc.timeline ?? createDefaultTimeline();
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
      doc.timeline = doc.timeline ?? createDefaultTimeline();
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

  function parseSessionIdFromClip(clipId: string): string | null {
    const match = /^session-clip-([^-]+(?:-[^-]+)*)/.exec(clipId);
    if (!match) return null;
    // clip id is session-clip-${sessionId} or session-clip-${sessionId}-${clientId}
    const rest = clipId.slice('session-clip-'.length);
    const session = programmerSessions.value.find(
      (entry) => rest === entry.id || rest.startsWith(`${entry.id}-`)
    );
    return session?.id ?? null;
  }

  return {
    playheadMs,
    isPlaying,
    pixelsPerSecond,
    scrollLeftPx,
    selectedCueId,
    selectedCueIds,
    previewEnabled,
    followPlayhead,
    operatorFilterClientId,
    timelineConfig,
    timelineTracks,
    cueTracks,
    cueTimelineTrack,
    automationTrack,
    programmerSessions,
    automationSessionClips,
    sessionView,
    sessionsByOperator,
    markers,
    sections,
    conflictDiagnostics,
    fps,
    syncMode,
    durationMs,
    timelineCues,
    setScrollLeftPx,
    setPlayheadMs,
    setSelectedCue,
    setSelectedCues,
    toggleCueSelection,
    setPreviewEnabled,
    play,
    pause,
    stop,
    returnToStart,
    seekToMs,
    assignCueTimecodeIn,
    assignCueTimecodeOut,
    ensureTimelineCue,
    createTimelineCue,
    duplicateSelectedClips,
    deleteSelectedClips,
    addCueTrack,
    setTrackEnabled,
    setTrackSolo,
    addMarker,
    addSection,
    upsertAutomationClip,
    snapPreviewSeconds,
    quantizeSeconds,
    parseSessionIdFromClip,
    syncPlayheadFromTimecode,
    stopPlaybackLoop,
  };
});
