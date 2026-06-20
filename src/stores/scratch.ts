/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { ScratchEntry } from 'src/engine/layers/scratch';
import { writeCrashSnapshot } from 'src/utils/crash-snapshot';

const HISTORY_LIMIT = 100;

type ScratchChannelUpdate = {
  path: string;
  value: number;
  attributeType: string;
  attributeName?: string;
  attributeId?: string;
  feature?: ScratchEntry['feature'];
};

function cloneEntries(entries: Map<string, ScratchEntry>): Map<string, ScratchEntry> {
  return new Map(Array.from(entries.entries()).map(([path, entry]) => [path, { ...entry }]));
}

export const useScratchStore = defineStore('scratch', () => {
  const entries = ref<Map<string, ScratchEntry>>(new Map());
  const blindMode = ref(false);
  const undoStack = ref<Map<string, ScratchEntry>[]>([]);
  const redoStack = ref<Map<string, ScratchEntry>[]>([]);

  const activeCount = computed(() => entries.value.size);
  const isActive = computed(() => entries.value.size > 0);
  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  function pushUndoSnapshot() {
    undoStack.value.push(cloneEntries(entries.value));
    if (undoStack.value.length > HISTORY_LIMIT) {
      undoStack.value.shift();
    }
    redoStack.value = [];
  }

  function persistCrashSnapshot() {
    writeCrashSnapshot({
      scratch: getEntries(),
    });
  }

  function setChannel(
    path: string,
    value: number,
    attributeType: string,
    meta?: Omit<ScratchChannelUpdate, 'path' | 'value' | 'attributeType'>
  ) {
    pushUndoSnapshot();
    entries.value.set(path, {
      path,
      value,
      attributeType,
      attributeName: meta?.attributeName,
      attributeId: meta?.attributeId,
      feature: meta?.feature,
      touchedAt: Date.now(),
    });
    persistCrashSnapshot();
  }

  function setChannels(channels: ScratchChannelUpdate[]) {
    pushUndoSnapshot();
    for (const ch of channels) {
      entries.value.set(ch.path, {
        path: ch.path,
        value: ch.value,
        attributeType: ch.attributeType,
        attributeName: ch.attributeName,
        attributeId: ch.attributeId,
        feature: ch.feature,
        touchedAt: Date.now(),
      });
    }
    persistCrashSnapshot();
  }

  function removePaths(paths: string[]) {
    if (paths.length === 0) return;
    pushUndoSnapshot();
    for (const path of paths) {
      entries.value.delete(path);
    }
    persistCrashSnapshot();
  }

  function getChannel(path: string): ScratchEntry | undefined {
    return entries.value.get(path);
  }

  function clear() {
    pushUndoSnapshot();
    entries.value.clear();
    persistCrashSnapshot();
  }

  function clearByAttributeType(attributeType: string) {
    pushUndoSnapshot();
    for (const [path, entry] of entries.value) {
      if (entry.attributeType === attributeType) {
        entries.value.delete(path);
      }
    }
    persistCrashSnapshot();
  }

  function getEntries(): ScratchEntry[] {
    return Array.from(entries.value.values());
  }

  function toggleBlind() {
    blindMode.value = !blindMode.value;
  }

  function setEntries(nextEntries: ScratchEntry[]) {
    entries.value = new Map(nextEntries.map((entry) => [entry.path, { ...entry }]));
    undoStack.value = [];
    redoStack.value = [];
    persistCrashSnapshot();
  }

  function undo() {
    const previous = undoStack.value.pop();
    if (!previous) return;

    redoStack.value.push(cloneEntries(entries.value));
    entries.value = previous;
    persistCrashSnapshot();
  }

  function redo() {
    const next = redoStack.value.pop();
    if (!next) return;

    undoStack.value.push(cloneEntries(entries.value));
    entries.value = next;
    persistCrashSnapshot();
  }

  return {
    entries,
    blindMode,
    activeCount,
    isActive,
    canUndo,
    canRedo,
    setChannel,
    setChannels,
    setEntries,
    getChannel,
    clear,
    clearByAttributeType,
    removePaths,
    getEntries,
    toggleBlind,
    undo,
    redo,
  };
});
