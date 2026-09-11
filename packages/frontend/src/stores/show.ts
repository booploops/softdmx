/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { ShowDocument } from '@softdmx/engine';
import type { ProgrammerOperator, StoreProfile } from '@softdmx/engine';
import { createEmptyShow } from '@softdmx/engine';
import {
  parseShowDocument,
  serializeShowDocument,
  downloadShowDocument,
  validateShowDocument,
} from '@softdmx/engine';
import { writeCrashSnapshot, clearCrashSnapshot, readCrashSnapshot } from 'src/utils/crash-snapshot';
import { readLastShow, writeLastShow } from 'src/utils/last-show';
import { useIOClient } from 'src/lib/io-client';
import { parseShowDocumentInWorker } from 'src/lib/show-parse-worker-client';
import { getRuntimeOptimizationFlags } from 'src/config/runtime-optimization-flags';
import { useDMXStore } from './dmx';
import { useOutputEngineStore } from './output-playback';
import { useScratchStore } from './scratch';
import { isElectronConfigEnv } from 'src/lib/config-persistence';
import { trpc } from 'src/lib/trpc';

const HISTORY_LIMIT = 100;
const AUTOSAVE_MS = 15_000;
let showSyncConnectHookInstalled = false;
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

function cloneDocument(doc: ShowDocument): ShowDocument {
  return JSON.parse(JSON.stringify(doc)) as ShowDocument;
}

export const useShowStore = defineStore('show', () => {
  const document = ref<ShowDocument>(validateShowDocument(createEmptyShow()));
  const isDirty = ref(false);
  const filePath = ref<string | null>(null);
  const undoStack = ref<ShowDocument[]>([]);
  const redoStack = ref<ShowDocument[]>([]);

  const name = computed(() => document.value.meta.name);
  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  const storeProfiles = computed<StoreProfile[]>(
    () => document.value.programmer?.storeProfiles ?? [],
  );
  const operators = computed<ProgrammerOperator[]>(
    () => document.value.programmer?.operators ?? [],
  );

  if (!showSyncConnectHookInstalled) {
    showSyncConnectHookInstalled = true;
    useIOClient().on('connect', () => {
      // Ensure backend always has latest show after reconnects.
      queueMicrotask(() => {
        useIOClient().emit('show:state', document.value);
      });
    });
  }

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

  function scheduleAutosave() {
    if (!isElectronConfigEnv) return;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      void persistShowToDisk();
    }, AUTOSAVE_MS);
  }

  async function persistShowToDisk(): Promise<string | null> {
    if (!isElectronConfigEnv) return null;
    try {
      const result = await trpc.saveShowToDisk.mutate({
        document: document.value,
        path: filePath.value,
      });
      if (result.path) {
        filePath.value = result.path;
      }
      return result.path ?? null;
    } catch (error) {
      console.error('Failed to persist show to disk:', error);
      return null;
    }
  }

  function markDirty() {
    isDirty.value = true;
    document.value.meta.modified = new Date().toISOString();
    persistCrashSnapshot();
    syncToBackend();
    scheduleAutosave();
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

  function applyDocument(nextDoc: ShowDocument, options?: { sync?: boolean; resetPlayback?: boolean }) {
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

  function loadShow(doc: ShowDocument, options?: { sync?: boolean; persist?: boolean }) {
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

  async function loadShowFromYaml(yaml: string) {
    const flags = getRuntimeOptimizationFlags();
    if (flags.showParseWorkerEnabled) {
      const parsed = await parseShowDocumentInWorker(yaml);
      loadShow(parsed);
      return;
    }
    loadShow(parseShowDocument(yaml));
  }

  async function loadShowFromFile(file: File) {
    const content = await file.text();
    if (!content.trim()) {
      throw new Error('File is empty');
    }
    const flags = getRuntimeOptimizationFlags();
    const doc = flags.showParseWorkerEnabled
      ? await parseShowDocumentInWorker(content)
      : parseShowDocument(content);
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
    void persistShowToDisk();
    return serializeShowDocument(document.value);
  }

  function downloadShow(filename?: string) {
    return downloadShowDocument(document.value, filename);
  }

  function updateDocument(mutator: (doc: ShowDocument) => void) {
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

  function ensureProgrammerConfig() {
    if (!document.value.programmer) {
      document.value.programmer = {};
    }
    return document.value.programmer;
  }

  function upsertStoreProfile(profile: StoreProfile) {
    updateDocument((doc) => {
      const programmer = doc.programmer ?? (doc.programmer = {});
      const profiles = programmer.storeProfiles ?? (programmer.storeProfiles = []);
      const index = profiles.findIndex((entry) => entry.id === profile.id);
      if (index >= 0) {
        profiles[index] = profile;
      } else {
        profiles.push(profile);
      }
    });
  }

  function removeStoreProfile(profileId: string) {
    updateDocument((doc) => {
      if (!doc.programmer?.storeProfiles) return;
      doc.programmer.storeProfiles = doc.programmer.storeProfiles.filter((entry) => entry.id !== profileId);
    });
  }

  function upsertOperator(operator: ProgrammerOperator) {
    updateDocument((doc) => {
      const programmer = doc.programmer ?? (doc.programmer = {});
      const nextOperators = programmer.operators ?? (programmer.operators = []);
      const index = nextOperators.findIndex((entry) => entry.id === operator.id);
      if (index >= 0) {
        nextOperators[index] = operator;
      } else {
        nextOperators.push(operator);
      }
    });
  }

  function removeOperator(operatorId: string) {
    updateDocument((doc) => {
      if (!doc.programmer?.operators) return;
      doc.programmer.operators = doc.programmer.operators.filter((entry) => entry.id !== operatorId);
    });
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
    storeProfiles,
    operators,
    ensureProgrammerConfig,
    upsertStoreProfile,
    removeStoreProfile,
    upsertOperator,
    removeOperator,
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
    persistShowToDisk,
    markDirty,
    syncToBackend,
  };
});
