/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref, toRaw } from "vue";
import { defineStore } from "pinia";
import { trpc } from "src/lib/trpc";

const STORAGE_KEY = "softdmx-workspace-state";

interface WorkspaceState {
  outerLayout: unknown;
  workspaceLayouts: Record<string, unknown>;
  activeWorkspaceId: string;
  textContents: Record<string, string>;
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
    activeWorkspaceId: "",
  };

  if (typeof localStorage === "undefined") return defaultState;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultState;

  try {
    const parsed = JSON.parse(stored);
    
    // MIGRATION: Migrate legacy textContents from local storage into corresponding panel params
    if (parsed && parsed.textContents && Object.keys(parsed.textContents).length > 0) {
      const texts = parsed.textContents;
      const layouts = parsed.workspaceLayouts || {};
      for (const [workspaceId, layout] of Object.entries(layouts)) {
        const layoutObj = layout as any;
        if (layoutObj && layoutObj.panels) {
          for (const [panelId, panel] of Object.entries(layoutObj.panels)) {
            const panelObj = panel as any;
            if (texts[panelId] !== undefined) {
              if (!panelObj.params) {
                panelObj.params = {};
              }
              panelObj.params.textContent = texts[panelId];
            }
          }
        }
      }
      delete parsed.textContents;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    
    return parsed;
  } catch (e) {
    console.error("Failed to parse workspace state:", e);
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
    console.warn(
      "[workspace] Failed to sanitize value for IPC, passing as-is",
      e,
    );
    return value;
  }
}

export const useWorkspaceStore = defineStore("workspace", () => {
  const isElectronEnv =
    typeof window !== "undefined" && !!(window as any).electronTRPC;

  // Start with empty state for Electron (client is source of truth).
  // localStorage is only used as fallback for non-Electron dev.
  const initialState = isElectronEnv
    ? { outerLayout: null, workspaceLayouts: {}, activeWorkspaceId: "" }
    : loadStateSync();

  const outerLayout = ref<unknown>(initialState.outerLayout);
  const workspaceLayouts = ref<Record<string, unknown>>(
    initialState.workspaceLayouts,
  );
  const activeWorkspaceId = ref<string>(initialState.activeWorkspaceId);
  const spawnRequest = ref<SpawnRequest | null>(null);

  const isHydrated = ref(!isElectronEnv); // true immediately for non-electron
  const hasLocalModifications = ref(false);
  let restoreDepth = 0;
  let hydratePromise: Promise<void> | null = null;

  function persistState(
    layoutOuter: unknown,
    layouts: Record<string, unknown>,
    activeId: string,
  ) {
    // Skip until client state is loaded and we are not in a programmatic restore.
    if (!isHydrated.value || restoreDepth > 0) return;

    hasLocalModifications.value = true;

    const data: WorkspaceState = {
      outerLayout: layoutOuter != null ? toCloneable(layoutOuter) : null,
      workspaceLayouts: layouts ? toCloneable(layouts) : {},
      activeWorkspaceId: activeId,
    };

    if (isElectronEnv) {
      // Persist via tRPC -> client state -> workspace.yml
      trpc.saveWorkspace
        .mutate({
          outerLayout: data.outerLayout,
          workspaceLayouts: data.workspaceLayouts,
          activeWorkspaceId: data.activeWorkspaceId,
        })
        .catch((e: unknown) =>
          console.error("Failed to save workspace via tRPC:", e),
        );
    } else if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }

  /**
   * Suppresses layout-change persistence while dockview is being restored from
   * saved JSON (fromJSON). Without this, restore-triggered layout events can
   * overwrite good client state with partial/empty layouts.
   */
  function withRestore<T>(fn: () => T): T {
    restoreDepth++;
    try {
      return fn();
    } finally {
      restoreDepth--;
    }
  }

  /**
   * Ensures we have loaded the authoritative workspace state from the client (via tRPC).
   * Returns a promise that resolves once hydration is complete.
   * This is critical to avoid race conditions where Dockview onReady runs
   * before the persisted layouts arrive, leading to default workspaces overwriting
   * good data and causing permanent desync.
   */
  function ensureHydrated(): Promise<void> {
    if (!isElectronEnv) {
      isHydrated.value = true;
      return Promise.resolve();
    }
    if (hydratePromise) return hydratePromise;

    hydratePromise = trpc.getWorkspace
      .query()
      .then((remote: any) => {
        if (remote) {
          // Only apply remote data if the user hasn't made local modifications yet.
          // This prevents a late-arriving hydrate from clobbering work the user
          // did while waiting for the (usually very fast) tRPC call.
          if (!hasLocalModifications.value) {
            let remoteLayouts = remote.workspaceLayouts || {};
            const remoteTexts = remote.textContents || {};

            // MIGRATION: Migrate old textContents into the workspace layouts
            if (Object.keys(remoteTexts).length > 0) {
              remoteLayouts = JSON.parse(JSON.stringify(remoteLayouts));
              let migratedAny = false;
              for (const [workspaceId, layout] of Object.entries(remoteLayouts)) {
                const layoutObj = layout as any;
                if (layoutObj && layoutObj.panels) {
                  for (const [panelId, panel] of Object.entries(layoutObj.panels)) {
                    const panelObj = panel as any;
                    if (remoteTexts[panelId] !== undefined) {
                      if (!panelObj.params) {
                        panelObj.params = {};
                      }
                      panelObj.params.textContent = remoteTexts[panelId];
                      migratedAny = true;
                    }
                  }
                }
              }

              if (migratedAny) {
                console.log("[workspace store] Successfully migrated old textContents into panel params");
              }
            }

            if (remote.outerLayout !== undefined)
              outerLayout.value = remote.outerLayout;
            
            workspaceLayouts.value = remoteLayouts;
            
            if (remote.activeWorkspaceId !== undefined)
              activeWorkspaceId.value = remote.activeWorkspaceId;

            if (Object.keys(remoteTexts).length > 0) {
              // Immediately write back the migrated layouts and clear textContents from disk
              persistState(
                outerLayout.value,
                workspaceLayouts.value,
                activeWorkspaceId.value,
              );
            }
          }
        }
        isHydrated.value = true;
      })
      .catch((e: unknown) => {
        console.error("Failed to load workspace via tRPC:", e);
        isHydrated.value = true;
      });

    return hydratePromise;
  }

  // Kick off hydration eagerly for Electron
  if (isElectronEnv) {
    ensureHydrated();
  }

  function saveOuterLayout(layout: unknown) {
    outerLayout.value = layout;
    persistState(
      outerLayout.value,
      workspaceLayouts.value,
      activeWorkspaceId.value,
    );
  }

  function saveWorkspaceLayout(id: string, layout: unknown) {
    workspaceLayouts.value = {
      ...workspaceLayouts.value,
      [id]: layout,
    };
    persistState(
      outerLayout.value,
      workspaceLayouts.value,
      activeWorkspaceId.value,
    );
  }

  function deleteWorkspaceLayout(id: string) {
    const updated = { ...workspaceLayouts.value };
    delete updated[id];
    workspaceLayouts.value = updated;
    if (activeWorkspaceId.value === id) {
      activeWorkspaceId.value = "";
    }
    persistState(
      outerLayout.value,
      workspaceLayouts.value,
      activeWorkspaceId.value,
    );
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
    hydrated: isHydrated, // ref<boolean> - use .value in JS code, auto-unwraps in templates
    ensureHydrated,
    withRestore,
    saveOuterLayout,
    saveWorkspaceLayout,
    deleteWorkspaceLayout,
    setActiveWorkspace,
    getWorkspaceLayout,
    requestSpawnPanel,
    requestCreateWorkspace,
  };
});
