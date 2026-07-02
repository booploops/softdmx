/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref, toRaw } from 'vue';
import { defineStore } from 'pinia';
import { trpc } from 'src/lib/trpc';

const STORAGE_KEY = 'softdmx-workspace-state';

interface WorkspaceState {
  outerLayout: unknown;
  workspaceLayouts: Record<string, unknown>;
  activeWorkspaceId: string;
}

interface SpawnRequest {
  workspaceId: string;
  path: string;
  title: string;
  timestamp: number;
}

interface CreateWorkspaceRequest {
  id: string;
  name: string;
  layout?: unknown;
  timestamp: number;
}

function loadStateSync(): WorkspaceState {
  const defaultState: WorkspaceState = {
    outerLayout: null,
    workspaceLayouts: {},
    activeWorkspaceId: '',
  };

  if (typeof localStorage === 'undefined') return defaultState;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultState;

  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse workspace state:', e);
    return defaultState;
  }
}

/**
 * Deeply strips Vue reactivity (proxies) and produces a plain, structured-cloneable object.
 * This is required because electron-trpc uses the Structured Clone algorithm across IPC,
 * and dockview.toJSON() objects stored in Vue refs are often wrapped in proxies.
 * Mirrors the toRaw + JSON clone pattern already used for workspace export.
 */
function toCloneable<T>(value: T): T {
  if (value == null) return value;
  try {
    const raw = toRaw(value as any);
    // Full JSON roundtrip ensures a fresh plain object tree with no proxies,
    // non-enumerable props, or non-cloneable values.
    return JSON.parse(JSON.stringify(raw));
  } catch (e) {
    console.warn('[workspace] Failed to sanitize value for IPC, passing as-is', e);
    return value;
  }
}

function persistState(
  outerLayout: unknown,
  workspaceLayouts: Record<string, unknown>,
  activeWorkspaceId: string
) {
  const data: WorkspaceState = {
    outerLayout: outerLayout != null ? toCloneable(outerLayout) : null,
    workspaceLayouts: workspaceLayouts
      ? toCloneable(workspaceLayouts)
      : {},
    activeWorkspaceId,
  };

  const isElectron = typeof window !== 'undefined' && !!(window as any).electronTRPC;
  if (isElectron) {
    // Persist via tRPC -> client state -> workspace.xml (efficient XML schema)
    console.log('[workspace] persist -> tRPC.saveWorkspace', {
      active: data.activeWorkspaceId,
      hasOuter: data.outerLayout != null,
      layoutCount: Object.keys(data.workspaceLayouts || {}).length,
    });
    trpc.saveWorkspace
      .mutate({
        outerLayout: data.outerLayout,
        workspaceLayouts: data.workspaceLayouts,
        activeWorkspaceId: data.activeWorkspaceId,
      })
      .then(() => console.log('[workspace] saveWorkspace ack'))
      .catch((e: unknown) => console.error('Failed to save workspace via tRPC:', e));
  } else if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const state = loadStateSync();

  const outerLayout = ref<unknown>(state.outerLayout);
  const workspaceLayouts = ref<Record<string, unknown>>(state.workspaceLayouts);
  const activeWorkspaceId = ref<string>(state.activeWorkspaceId);
  const spawnRequest = ref<SpawnRequest | null>(null);

  // Hydrate from Electron client (workspace.xml via tRPC) if available.
  // This makes frontend workspaces use the XML persisted state passed over IPC.
  const isElectronEnv = typeof window !== 'undefined' && !!(window as any).electronTRPC;
  if (isElectronEnv) {
    trpc.getWorkspace
      .query()
      .then((remote: any) => {
        if (remote) {
          if (remote.outerLayout !== undefined) outerLayout.value = remote.outerLayout;
          if (remote.workspaceLayouts !== undefined) workspaceLayouts.value = remote.workspaceLayouts;
          if (remote.activeWorkspaceId !== undefined) activeWorkspaceId.value = remote.activeWorkspaceId;
        }
      })
      .catch((e: unknown) => console.error('Failed to load workspace via tRPC:', e));
  }

  function saveOuterLayout(layout: unknown) {
    outerLayout.value = layout;
    persistState(outerLayout.value, workspaceLayouts.value, activeWorkspaceId.value);
  }

  function saveWorkspaceLayout(id: string, layout: unknown) {
    workspaceLayouts.value = {
      ...workspaceLayouts.value,
      [id]: layout,
    };
    persistState(outerLayout.value, workspaceLayouts.value, activeWorkspaceId.value);
  }

  function deleteWorkspaceLayout(id: string) {
    const updated = { ...workspaceLayouts.value };
    delete updated[id];
    workspaceLayouts.value = updated;
    if (activeWorkspaceId.value === id) {
      activeWorkspaceId.value = '';
    }
    persistState(outerLayout.value, workspaceLayouts.value, activeWorkspaceId.value);
  }

  function setActiveWorkspace(id: string) {
    activeWorkspaceId.value = id;
    // Active ID is session-oriented; avoid spamming full persists on every focus.
    // Layout modifications (saveOuterLayout / saveWorkspaceLayout) still persist full state.
  }

  function getWorkspaceLayout(id: string): unknown {
    return workspaceLayouts.value[id] || null;
  }

  function requestSpawnPanel(workspaceId: string, path: string, title: string) {
    spawnRequest.value = {
      workspaceId,
      path,
      title,
      timestamp: Date.now(),
    };
  }

  const createWorkspaceRequest = ref<CreateWorkspaceRequest | null>(null);

  function requestCreateWorkspace(name: string, layout?: unknown) {
    const id = `workspace-${Date.now()}`;
    if (layout) {
      saveWorkspaceLayout(id, layout);
    }
    createWorkspaceRequest.value = {
      id,
      name,
      layout,
      timestamp: Date.now(),
    };
    return id;
  }

  return {
    outerLayout,
    workspaceLayouts,
    activeWorkspaceId,
    spawnRequest,
    createWorkspaceRequest,
    saveOuterLayout,
    saveWorkspaceLayout,
    deleteWorkspaceLayout,
    setActiveWorkspace,
    getWorkspaceLayout,
    requestSpawnPanel,
    requestCreateWorkspace,
  };
});
