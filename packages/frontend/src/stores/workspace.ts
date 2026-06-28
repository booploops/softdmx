/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref } from 'vue';
import { defineStore } from 'pinia';

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

function loadState(): WorkspaceState {
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

export const useWorkspaceStore = defineStore('workspace', () => {
  const state = loadState();

  const outerLayout = ref<unknown>(state.outerLayout);
  const workspaceLayouts = ref<Record<string, unknown>>(state.workspaceLayouts);
  const activeWorkspaceId = ref<string>(state.activeWorkspaceId);
  const spawnRequest = ref<SpawnRequest | null>(null);

  function saveToLocalStorage() {
    if (typeof localStorage === 'undefined') return;
    const data: WorkspaceState = {
      outerLayout: outerLayout.value,
      workspaceLayouts: workspaceLayouts.value,
      activeWorkspaceId: activeWorkspaceId.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function saveOuterLayout(layout: unknown) {
    outerLayout.value = layout;
    saveToLocalStorage();
  }

  function saveWorkspaceLayout(id: string, layout: unknown) {
    workspaceLayouts.value = {
      ...workspaceLayouts.value,
      [id]: layout,
    };
    saveToLocalStorage();
  }

  function deleteWorkspaceLayout(id: string) {
    const updated = { ...workspaceLayouts.value };
    delete updated[id];
    workspaceLayouts.value = updated;
    if (activeWorkspaceId.value === id) {
      activeWorkspaceId.value = '';
    }
    saveToLocalStorage();
  }

  function setActiveWorkspace(id: string) {
    activeWorkspaceId.value = id;
    saveToLocalStorage();
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
