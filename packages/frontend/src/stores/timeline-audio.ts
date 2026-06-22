/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useShowStore } from './show';
import { useTimelineEditorStore } from './timeline-editor';
import {
  decodeAudioFile,
  deleteTimelineAudioAsset,
  loadTimelineAudioAsset,
  saveTimelineAudioAsset,
  type StoredTimelineAudioAsset,
} from 'src/utils/timeline-audio-storage';
import type { ShowTimelineAudioAsset } from '@softdmx/engine';

export const useTimelineAudioStore = defineStore('timeline-audio', () => {
  const showStore = useShowStore();
  const timelineEditor = useTimelineEditorStore();

  const loadedAssets = ref<Map<string, StoredTimelineAudioAsset>>(new Map());
  const objectUrls = ref<Map<string, string>>(new Map());
  const isImporting = ref(false);
  const errorMessage = ref<string | null>(null);

  let audioElement: HTMLAudioElement | null = null;
  let audioContext: AudioContext | null = null;

  const assets = computed(() => showStore.document.timeline?.audioAssets ?? []);
  const primaryAsset = computed(() => {
    const primaryId = showStore.document.timeline?.primaryAudioAssetId;
    if (!primaryId) return assets.value[0] ?? null;
    return assets.value.find((asset) => asset.id === primaryId) ?? assets.value[0] ?? null;
  });

  const primaryPeaks = computed(() => {
    const asset = primaryAsset.value;
    if (!asset) return [] as number[];
    return loadedAssets.value.get(asset.id)?.peaks ?? [];
  });

  function revokeObjectUrl(id: string) {
    const url = objectUrls.value.get(id);
    if (url) URL.revokeObjectURL(url);
    objectUrls.value.delete(id);
  }

  async function ensureAssetLoaded(assetId: string): Promise<StoredTimelineAudioAsset | null> {
    const cached = loadedAssets.value.get(assetId);
    if (cached) return cached;

    const stored = await loadTimelineAudioAsset(assetId);
    if (!stored) return null;

    loadedAssets.value.set(assetId, stored);
    revokeObjectUrl(assetId);
    objectUrls.value.set(assetId, URL.createObjectURL(stored.blob));
    return stored;
  }

  async function importAudioFile(file: File) {
    isImporting.value = true;
    errorMessage.value = null;

    try {
      const decoded = await decodeAudioFile(file);
      const id = `timeline-audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const assetMeta: ShowTimelineAudioAsset = {
        id,
        name: file.name.replace(/\.[^.]+$/, ''),
        fileName: file.name,
        durationMs: decoded.durationMs,
        offsetMs: 0,
        volume: 1,
      };

      await saveTimelineAudioAsset({
        id,
        fileName: file.name,
        mimeType: file.type || 'audio/mpeg',
        durationMs: decoded.durationMs,
        peaks: decoded.peaks,
        blob: file,
      });

      showStore.updateDocument((doc) => {
        doc.timeline = doc.timeline ?? {
          durationMs: 300_000,
          fps: 30,
          syncMode: 'free',
          primaryAudioAssetId: null,
          audioAssets: [],
        };
        doc.timeline.audioAssets = [...(doc.timeline.audioAssets ?? []), assetMeta];
        doc.timeline.primaryAudioAssetId = id;
        doc.timeline.durationMs = Math.max(doc.timeline.durationMs ?? 0, decoded.durationMs + (assetMeta.offsetMs ?? 0));
      });

      await ensureAssetLoaded(id);
      await prepareAudioElement();
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to import audio';
      throw error;
    } finally {
      isImporting.value = false;
    }
  }

  async function removePrimaryAsset() {
    const asset = primaryAsset.value;
    if (!asset) return;

    await deleteTimelineAudioAsset(asset.id);
    loadedAssets.value.delete(asset.id);
    revokeObjectUrl(asset.id);

    showStore.updateDocument((doc) => {
      if (!doc.timeline) return;
      doc.timeline.audioAssets = (doc.timeline.audioAssets ?? []).filter((entry) => entry.id !== asset.id);
      doc.timeline.primaryAudioAssetId = doc.timeline.audioAssets[0]?.id ?? null;
    });

    disposeAudioElement();
  }

  async function prepareAudioElement() {
    const asset = primaryAsset.value;
    if (!asset) {
      disposeAudioElement();
      return;
    }

    const stored = await ensureAssetLoaded(asset.id);
    if (!stored) return;

    const url = objectUrls.value.get(asset.id);
    if (!url) return;

    disposeAudioElement();
    audioElement = new Audio(url);
    audioElement.preload = 'auto';
    audioElement.volume = asset.volume ?? 1;
  }

  function disposeAudioElement() {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
      audioElement = null;
    }
  }

  function syncAudioToPlayhead() {
    if (!audioElement || !primaryAsset.value) return;
    const offsetSec = (primaryAsset.value.offsetMs ?? 0) / 1000;
    const targetSec = Math.max(0, timelineEditor.playheadMs / 1000 - offsetSec);
    if (Math.abs(audioElement.currentTime - targetSec) > 0.05) {
      audioElement.currentTime = targetSec;
    }
  }

  function playAudio() {
    if (!audioElement) return;
    syncAudioToPlayhead();
    void audioElement.play();
  }

  function pauseAudio() {
    audioElement?.pause();
  }

  function stopAudio() {
    if (!audioElement) return;
    audioElement.pause();
    audioElement.currentTime = 0;
  }

  watch(
    () => timelineEditor.playheadMs,
    () => {
      if (!timelineEditor.isPlaying) {
        syncAudioToPlayhead();
      }
    }
  );

  watch(
    () => timelineEditor.isPlaying,
    (playing) => {
      if (playing) playAudio();
      else pauseAudio();
    }
  );

  watch(primaryAsset, () => {
    void prepareAudioElement();
  });

  return {
    assets,
    primaryAsset,
    primaryPeaks,
    isImporting,
    errorMessage,
    importAudioFile,
    removePrimaryAsset,
    ensureAssetLoaded,
    prepareAudioElement,
    playAudio,
    pauseAudio,
    stopAudio,
    disposeAudioElement,
  };
});
