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

const HISTORY_LIMIT = 100;
let showSyncConnectHookInstalled = false;

function cloneDocument(doc: ShowDocument): ShowDocument {
  return JSON.parse(JSON.stringify(doc)) as ShowDocument;
}

export const useShowStore = defineStore('show', () => {
  const document = ref<ShowDocument>(validateShowDocument(createEmptyShow()));
  const isDirty = ref(false);
  const filePath = ref<string | null>(null);
  const undoStack = ref<ShowDocument[]>([]);
  const redoStack = ref<ShowDocument[]>([]);

  const isHydrated = ref(false);
  const showStartupDialogVisible = ref(false);

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
    const io = useIOClient();
    io.on('connect', () => {
      io.emit('show:get');
    });

    io.on('show:state-sync', (payload: {
      document: ShowDocument;
      isDirty: boolean;
      filePath: string | null;
      undoStack: ShowDocument[];
      redoStack: ShowDocument[];
    }) => {
      const isLoaded = !payload.isDirty && payload.undoStack.length === 0;

      document.value = payload.document;
      isDirty.value = payload.isDirty;
      filePath.value = payload.filePath;
      undoStack.value = payload.undoStack;
      redoStack.value = payload.redoStack;

      const dmx = useDMXStore();
      dmx.rebuildFromShow(document.value);

      const engine = useOutputEngineStore();
      engine.syncPlaybackFromShow(document.value);

      if (isLoaded) {
        engine.resetPlayback();
      }

      persistCrashSnapshot();
      persistLastSession();

      const isPayloadEmpty =
        payload.document.fixtures.length === 0 &&
        (!payload.document.groups || payload.document.groups.length === 0) &&
        (!payload.document.presets || payload.document.presets.length === 0) &&
        (!payload.document.cues || payload.document.cues.length === 0) &&
        (!payload.document.effects || payload.document.effects.length === 0) &&
        payload.filePath === null &&
        !payload.isDirty &&
        payload.undoStack.length === 0 &&
        payload.redoStack.length === 0;

      if (!isHydrated.value) {
        showStartupDialogVisible.value = isPayloadEmpty;
        isHydrated.value = true;
      } else if (!isPayloadEmpty) {
        showStartupDialogVisible.value = false;
      }
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

  function markDirty() {
    document.value.meta.modified = new Date().toISOString();
    useIOClient().emit('show:action:updateDocument', { document: document.value });
  }

  function syncToBackend() {
    // No-op - backend stays in sync using unidirectional data flow on any server actions
  }

  function persistLastSession() {
    writeLastShow({
      document: document.value,
      scratch: useScratchStore().getEntries(),
      filePath: filePath.value,
    });
  }

  function applyDocument(nextDoc: ShowDocument, options?: { sync?: boolean; resetPlayback?: boolean }) {
    // In server-side show state model, state mutations flow unidirectionally from backend state-sync,
    // so we no longer mutate document.value or call rebuildFromShow directly here.
    // Instead we emit updateDocument to the backend.
    useIOClient().emit('show:action:updateDocument', { document: nextDoc });
  }

  function loadShow(doc: ShowDocument, options?: { sync?: boolean; persist?: boolean }) {
    useIOClient().emit('show:action:load', {
      document: validateShowDocument(doc),
      filePath: filePath.value,
    });
  }

  function loadLastSession(): boolean {
    const session = readLastShow();
    if (!session?.document) return false;

    filePath.value = session.filePath ?? null;
    loadShow(session.document, { persist: false });
    useScratchStore().setEntries(session.scratch ?? []);
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
    filePath.value = file.name;
    loadShow(doc);
  }

  function newShow(showName?: string) {
    useIOClient().emit('show:action:new', { showName });
  }

  function saveShow(): string {
    useIOClient().emit('show:action:save');
    clearCrashSnapshot();
    return serializeShowDocument(document.value);
  }

  function downloadShow(filename?: string) {
    return downloadShowDocument(document.value, filename);
  }

  function updateDocument(mutator: (doc: ShowDocument) => void) {
    const nextDoc = cloneDocument(document.value);
    mutator(nextDoc);
    useIOClient().emit('show:action:updateDocument', { document: nextDoc });
  }

  function undo() {
    useIOClient().emit('show:action:undo');
  }

  function redo() {
    useIOClient().emit('show:action:redo');
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
    isHydrated,
    showStartupDialogVisible,
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
    markDirty,
    syncToBackend,
  };
});
