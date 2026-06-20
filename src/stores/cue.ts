/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Cue, CueLayer, RecordedFrame } from 'src/types';
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { cloneDeep } from 'lodash-es';
import { useShowStore } from './show';
import { useDMXStore } from './dmx';
import { useOutputEngineStore } from './output-engine';
import { useScratchStore } from './scratch';
import { getCueTotalDuration } from 'src/engine/cue-playback';
import type { AttributeFeature } from 'src/types/attributes';
import type { ProgrammerStoreMode } from './programmer';
import { applyProgrammerStoreMode, captureScratchPreset } from 'src/utils/programmer-store';
import { filterScratchEntries } from 'src/utils/programmer-filter';
import { resolvePresetIdFromPoolSlot } from 'src/utils/preset-pool';

export const useCueStore = defineStore('cue-store', () => {
  const showStore = useShowStore();
  const dmx = useDMXStore();
  const engine = useOutputEngineStore();
  const scratch = useScratchStore();

  const activeCueId = ref<string | null>(null);
  const activeLayerId = ref<string | null>(null);
  const activeFrameIndex = ref<number | null>(null);
  const timelinePosition = ref(0);
  const timelineZoom = ref(1);
  const timelineSnapping = ref(true);
  const snapInterval = ref(250);
  const selectedFrames = ref<Set<string>>(new Set());
  const clipboard = ref<RecordedFrame[]>([]);
  const isRecording = ref(false);

  const cues = computed(() => showStore.document.cues);

  const activeCue = computed(() => {
    if (!activeCueId.value) return null;
    return cues.value.find((cue) => cue.id === activeCueId.value) || null;
  });

  const activeLayer = computed(() => {
    if (!activeCue.value || !activeLayerId.value) return null;
    return activeCue.value.layers?.find((layer) => layer.id === activeLayerId.value) || null;
  });

  const totalDuration = computed(() => {
    if (!activeCue.value) return 0;
    return getCueTotalDuration(activeCue.value);
  });

  const playbackBusMaster = computed({
    get: () => engine.playbackBusMaster,
    set: (value: number) => engine.setPlaybackBusMaster(value),
  });
  const playbackStates = computed(() => engine.playbackStates);
  const isGlobalPlaying = computed(() => engine.isGlobalPlaying);

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function createNewLayer(name: string): CueLayer {
    return {
      id: generateId(),
      name,
      frames: [],
      enabled: true,
      opacity: 1.0,
      blendMode: 'replace',
      solo: false,
    };
  }

  function createNewCue(name: string, view: 'timeline' | 'stack' = 'timeline'): Cue {
    const now = new Date().toISOString();
    return {
      id: generateId(),
      name,
      description: '',
      timecodeIn: undefined,
      timecodeOut: undefined,
      view,
      tracking: false,
      block: true,
      mib: false,
      layers: view === 'timeline' ? [createNewLayer(`${name} - Main`)] : [],
      stack: view === 'stack' ? [] : [],
      totalDuration: 0,
      isLooping: false,
      fadeInDuration: 0,
      fadeOutDuration: 0,
      priority: 1,
      tags: [],
      created: now,
      modified: now,
    };
  }

  function updateCueModified(cue: Cue) {
    cue.modified = new Date().toISOString();
    cue.totalDuration = getCueTotalDuration(cue);
    showStore.markDirty();
  }

  function addCue(name: string, view: 'timeline' | 'stack' = 'timeline') {
    const cue = createNewCue(name, view);
    showStore.updateDocument((doc) => {
      doc.cues.push(cue);
    });
    activeCueId.value = cue.id;
    activeLayerId.value = cue.layers?.[0]?.id ?? null;
    return cue;
  }

  function duplicateCue(cueId: string) {
    const original = cues.value.find((c) => c.id === cueId);
    if (!original) return;

    const duplicated = cloneDeep(original);
    duplicated.id = generateId();
    duplicated.name = `${original.name} Copy`;
    duplicated.created = new Date().toISOString();
    duplicated.modified = new Date().toISOString();
    duplicated.layers = duplicated.layers?.map((layer) => ({ ...layer, id: generateId() }));
    duplicated.stack = duplicated.stack?.map((step) => ({ ...step, id: generateId() }));

    showStore.updateDocument((doc) => {
      doc.cues.push(duplicated);
    });
    return duplicated;
  }

  function deleteCue(cueId: string) {
    showStore.updateDocument((doc) => {
      doc.cues = doc.cues.filter((c) => c.id !== cueId);
    });
    engine.stopCue(cueId);
    if (activeCueId.value === cueId) {
      activeCueId.value = cues.value[0]?.id ?? null;
      activeLayerId.value = cues.value[0]?.layers?.[0]?.id ?? null;
    }
  }

  function addLayer(cueId: string, name: string) {
    const layer = createNewLayer(name);
    showStore.updateDocument((doc) => {
      const cue = doc.cues.find((c) => c.id === cueId);
      if (cue) {
        cue.layers = cue.layers ?? [];
        cue.layers.push(layer);
        updateCueModified(cue);
      }
    });
    return layer;
  }

  function deleteLayer(cueId: string, layerId: string) {
    showStore.updateDocument((doc) => {
      const cue = doc.cues.find((c) => c.id === cueId);
      if (cue?.layers) {
        cue.layers = cue.layers.filter((l) => l.id !== layerId);
        updateCueModified(cue);
      }
    });
    if (activeLayerId.value === layerId) {
      activeLayerId.value = activeCue.value?.layers?.[0]?.id ?? null;
    }
  }

  function recordFrame(at?: number) {
    if (!activeLayer.value) return;

    const mergedOutput = engine.computeMergedOutput({ includeBlindScratch: true });
    const position = at ?? timelinePosition.value;
    const frame: RecordedFrame = {
      name: `Frame ${activeLayer.value.frames.length + 1}`,
      type: 'channels',
      channels: cloneDeep(mergedOutput),
      duration: 1000,
      easing: 'linear',
    };

    showStore.updateDocument((doc) => {
      const cue = doc.cues.find((c) => c.id === activeCueId.value);
      const layer = cue?.layers?.find((l) => l.id === activeLayerId.value);
      if (!layer) return;

      const insertIndex = layer.frames.findIndex((_f, i) => {
        const frameStart = layer.frames.slice(0, i).reduce((acc, fr) => acc + (fr.duration || 1000), 0);
        return frameStart > position;
      });

      if (insertIndex === -1) {
        layer.frames.push(frame);
        activeFrameIndex.value = layer.frames.length - 1;
      } else {
        layer.frames.splice(insertIndex, 0, frame);
        activeFrameIndex.value = insertIndex;
      }

      if (cue) updateCueModified(cue);
    });
  }

  function recordScratchAsPreset(
    name: string,
    options?: {
      mode?: ProgrammerStoreMode;
      attributeFilter?: AttributeFeature[];
      presetId?: string;
      poolId?: string;
      poolSlot?: number;
      clearScratch?: boolean;
    }
  ) {
    const entries = scratch.getEntries();
    if (entries.length === 0) return;

    const mode = options?.mode ?? 'store';
    const attributeFilter = options?.attributeFilter;
    const mergedByPath = new Map(
      engine.computeMergedOutput({ includeBlindScratch: true }).map((ch) => [ch.path, ch.value])
    );
    const capture = captureScratchPreset(
      entries,
      dmx.showfileFixturesMapped,
      mergedByPath,
      attributeFilter
    );
    if (capture.targets.length === 0) return;

    let targetPresetId = options?.presetId;
    if (!targetPresetId && options?.poolId !== undefined && options.poolSlot !== undefined) {
      targetPresetId = resolvePresetIdFromPoolSlot(showStore.document, options.poolId, options.poolSlot) ?? undefined;
    }

    const existingPreset = targetPresetId
      ? showStore.document.presets.find((preset) => preset.id === targetPresetId)
      : undefined;

    const nextTargets = applyProgrammerStoreMode(mode, existingPreset, capture);
    if (nextTargets.length === 0 && mode === 'remove' && existingPreset) {
      showStore.updateDocument((doc) => {
        doc.presets = doc.presets.filter((preset) => preset.id !== existingPreset.id);
      });
    } else if (existingPreset) {
      showStore.updateDocument((doc) => {
        const preset = doc.presets.find((entry) => entry.id === existingPreset.id);
        if (!preset) return;
        preset.targets = nextTargets;
      });
    } else {
      const id = generateId();
      showStore.updateDocument((doc) => {
        doc.presets.push({
          id,
          name,
          targets: nextTargets,
        });
        if (options?.poolId !== undefined && options.poolSlot !== undefined) {
          const pool = (doc.presetPools ?? []).find((entry) => entry.id === options.poolId);
          if (pool) {
            while (pool.slots.length <= options.poolSlot!) {
              pool.slots.push('');
            }
            pool.slots[options.poolSlot!] = id;
          }
        }
      });
      targetPresetId = id;
    }

    if (options?.clearScratch !== false) {
      const filteredPaths = new Set(
        filterScratchEntries(entries, attributeFilter).map((entry) => entry.path)
      );
      if (attributeFilter && attributeFilter.length > 0) {
        scratch.removePaths([...filteredPaths]);
      } else {
        scratch.clear();
      }
    }

    return targetPresetId;
  }

  function deleteFrame(layerId: string, frameIndex: number) {
    showStore.updateDocument((doc) => {
      const cue = doc.cues.find((c) => c.id === activeCueId.value);
      const layer = cue?.layers?.find((l) => l.id === layerId);
      if (!layer || frameIndex < 0 || frameIndex >= layer.frames.length) return;
      layer.frames.splice(frameIndex, 1);
      if (cue) updateCueModified(cue);
    });
  }

  function moveFrame(layerId: string, fromIndex: number, toIndex: number) {
    showStore.updateDocument((doc) => {
      const cue = doc.cues.find((c) => c.id === activeCueId.value);
      const layer = cue?.layers?.find((l) => l.id === layerId);
      if (!layer) return;
      const frame = layer.frames.splice(fromIndex, 1)[0];
      if (frame) layer.frames.splice(toIndex, 0, frame);
      if (cue) updateCueModified(cue);
    });
  }

  function updateCueModifiedForActive() {
    if (activeCue.value) updateCueModified(activeCue.value);
  }

  function copyFrames(layerId: string, frameIndices: number[]) {
    const layer = activeCue.value?.layers?.find((l) => l.id === layerId);
    if (!layer || frameIndices.length === 0) {
      clipboard.value = [];
      return;
    }

    const sorted = [...new Set(frameIndices)]
      .filter((idx) => idx >= 0 && idx < layer.frames.length)
      .sort((a, b) => a - b);

    clipboard.value = sorted.map((idx) => cloneDeep(layer.frames[idx]!));
  }

  function pasteFrames(layerId: string, atIndex: number) {
    if (clipboard.value.length === 0) return;

    showStore.updateDocument((doc) => {
      const cue = doc.cues.find((c) => c.id === activeCueId.value);
      const layer = cue?.layers?.find((l) => l.id === layerId);
      if (!cue || !layer) return;

      const insertAt = Math.max(0, Math.min(atIndex, layer.frames.length));
      const copies = clipboard.value.map((frame) => cloneDeep(frame));
      layer.frames.splice(insertAt, 0, ...copies);
      updateCueModified(cue);
      activeFrameIndex.value = insertAt;
    });
  }

  function setTimelinePosition(timeMs: number) {
    timelinePosition.value = timeMs;
  }

  function snapToGrid(timeMs: number): number {
    if (!timelineSnapping.value) return timeMs;
    return Math.round(timeMs / snapInterval.value) * snapInterval.value;
  }

  // Playback delegated to output engine
  const playCue = (cueId: string) => engine.playCue(cueId);
  const pauseCue = (cueId: string) => engine.pauseCue(cueId);
  const stopCue = (cueId: string) => engine.stopCue(cueId);
  const stopAllCues = () => engine.stopAllCues();
  const setCueIntensity = (cueId: string, intensity: number) => engine.setCueIntensity(cueId, intensity);
  const setCueLevel = (cueId: string, level: number) => engine.setCueLevel(cueId, level);
  const getCueLevel = (cueId: string) => engine.getCueLevel(cueId);
  const setPlaybackBusMaster = (intensity: number) => engine.setPlaybackBusMaster(intensity);
  const stackGo = (cueId: string) => engine.stackGo(cueId);
  const firePreset = (presetId: string, fadeMs?: number) => engine.firePreset(presetId, fadeMs);

  function setCueLooping(cueId: string, isLooping: boolean) {
    showStore.updateDocument((doc) => {
      const cue = doc.cues.find((c) => c.id === cueId);
      if (cue) {
        cue.isLooping = isLooping;
        updateCueModified(cue);
      }
    });
  }

  function getCueProgress(cueId: string): number {
    const state = engine.playbackStates.get(cueId);
    if (!state) return 0;
    const cue = cues.value.find((c) => c.id === cueId);
    if (!cue) return 0;
    const duration = getCueTotalDuration(cue) || 1000;
    return Math.min(state.currentTime / duration, 1);
  }

  return {
    cues,
    activeCueId,
    activeLayerId,
    activeFrameIndex,
    timelinePosition,
    timelineZoom,
    timelineSnapping,
    snapInterval,
    selectedFrames,
    clipboard,
    isRecording,
    activeCue,
    activeLayer,
    totalDuration,
    playbackStates,
    isGlobalPlaying,
    playbackBusMaster,
    generateId,
    addCue,
    duplicateCue,
    deleteCue,
    addLayer,
    deleteLayer,
    recordFrame,
    recordScratchAsPreset,
    deleteFrame,
    moveFrame,
    copyFrames,
    pasteFrames,
    updateCueModified: updateCueModifiedForActive,
    setTimelinePosition,
    snapToGrid,
    playCue,
    pauseCue,
    stopCue,
    stopAllCues,
    setCueIntensity,
    setCueLevel,
    getCueLevel,
    setPlaybackBusMaster,
    setCueLooping,
    getCueProgress,
    stackGo,
    firePreset,
  };
});
