/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { ShowDocumentV1 } from 'src/types/show-document';
import { createEmptyShow } from 'src/types/show-document';
import {
  parseShowDocument,
  serializeShowDocument,
  downloadShowDocument,
  loadShowDocumentFromFile,
  validateShowDocument,
} from 'src/utils/show-io';
import { writeCrashSnapshot, clearCrashSnapshot, readCrashSnapshot } from 'src/utils/crash-snapshot';
import { readLastShow, writeLastShow } from 'src/utils/last-show';
import { useIOClient } from 'src/lib/io-client';
import { useDMXStore } from './dmx';
import { useOutputEngineStore } from './output-engine';
import { useScratchStore } from './scratch';

const HISTORY_LIMIT = 100;

function cloneDocument(doc: ShowDocumentV1): ShowDocumentV1 {
  return JSON.parse(JSON.stringify(doc)) as ShowDocumentV1;
}

export const useShowStore = defineStore('show', () => {
  const document = ref<ShowDocumentV1>(validateShowDocument(createEmptyShow()));
  const isDirty = ref(false);
  const filePath = ref<string | null>(null);
  const undoStack = ref<ShowDocumentV1[]>([]);
  const redoStack = ref<ShowDocumentV1[]>([]);

  const name = computed(() => document.value.meta.name);
  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  function resetHistory() {
    undoStack.value = [];
    redoStack.value = [];
  }

  function persistCrashSnapshot() {
    writeCrashSnapshot({
      document: document.value,
      scratch: useScratchStore().getEntries(),
    });
  }

  function pushUndoSnapshot() {
    undoStack.value.push(cloneDocument(document.value));
    if (undoStack.value.length > HISTORY_LIMIT) {
      undoStack.value.shift();
    }
    redoStack.value = [];
  }

  function markDirty() {
    isDirty.value = true;
    document.value.meta.modified = new Date().toISOString();
    persistCrashSnapshot();
    syncToBackend();
  }

  function syncToBackend() {
    // Defer emit to avoid synchronous re-entrancy during boot/load
    queueMicrotask(() => {
      useIOClient().emit('show:state', document.value);
    });
  }

  function persistLastSession() {
    writeLastShow({
      document: document.value,
      scratch: useScratchStore().getEntries(),
      filePath: filePath.value,
    });
  }

  function applyDocument(nextDoc: ShowDocumentV1, options?: { sync?: boolean; resetPlayback?: boolean }) {
    document.value = nextDoc;

    const dmx = useDMXStore();
    dmx.rebuildFromShow(document.value);

    const engine = useOutputEngineStore();
    engine.syncPlaybackFromShow(document.value);

    if (options?.resetPlayback !== false) {
      engine.resetPlayback();
    }

    if (options?.sync !== false) {
      syncToBackend();
    }
  }

  function loadShow(doc: ShowDocumentV1, options?: { sync?: boolean; persist?: boolean }) {
    document.value = validateShowDocument(doc);
    isDirty.value = false;
    resetHistory();
    applyDocument(document.value, { sync: options?.sync, resetPlayback: true });
    persistCrashSnapshot();
    if (options?.persist !== false) {
      persistLastSession();
    }
  }

  function loadLastSession(): boolean {
    const session = readLastShow();
    if (!session?.document) return false;

    loadShow(session.document, { persist: false });
    useScratchStore().setEntries(session.scratch ?? []);
    filePath.value = session.filePath ?? null;
    persistLastSession();
    return true;
  }

  function loadCrashSnapshot(): boolean {
    const snapshot = readCrashSnapshot();
    if (!snapshot?.document) return false;

    loadShow(snapshot.document);
    useScratchStore().setEntries(snapshot.scratch ?? []);
    return true;
  }

  function loadShowFromYaml(yaml: string) {
    loadShow(parseShowDocument(yaml));
  }

  async function loadShowFromFile(file: File) {
    const doc = await loadShowDocumentFromFile(file);
    loadShow(doc);
    filePath.value = file.name;
  }

  function newShow(showName?: string) {
    loadShow(createEmptyShow(showName));
    filePath.value = null;
  }

  function saveShow(): string {
    isDirty.value = false;
    clearCrashSnapshot();
    return serializeShowDocument(document.value);
  }

  function downloadShow(filename?: string) {
    return downloadShowDocument(document.value, filename);
  }

  function updateDocument(mutator: (doc: ShowDocumentV1) => void) {
    pushUndoSnapshot();
    mutator(document.value);
    markDirty();
  }

  function undo() {
    const previous = undoStack.value.pop();
    if (!previous) return;

    redoStack.value.push(cloneDocument(document.value));
    document.value = previous;
    markDirty();
    applyDocument(document.value, { sync: true, resetPlayback: true });
  }

  function redo() {
    const next = redoStack.value.pop();
    if (!next) return;

    undoStack.value.push(cloneDocument(document.value));
    document.value = next;
    markDirty();
    applyDocument(document.value, { sync: true, resetPlayback: true });
  }

  return {
    document,
    isDirty,
    filePath,
    name,
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    loadShow,
    loadLastSession,
    loadShowFromYaml,
    loadShowFromFile,
    loadCrashSnapshot,
    newShow,
    saveShow,
    downloadShow,
    updateDocument,
    undo,
    redo,
    persistCrashSnapshot,
    persistLastSession,
    markDirty,
    syncToBackend,
  };
});
