/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import type { DeskPane, DeskPaneRect, DeskView, DeskWindowType } from '@softdmx/engine';
import { DESK_GRID_COLS, validateDeskPane } from '@softdmx/engine';
import { useShowStore } from './show';
import { createDefaultDeskConfig, DEFAULT_DESK_VIEWS } from '@softdmx/engine';

export const useDeskViewStore = defineStore('desk-view', () => {
  const showStore = useShowStore();
  const activeViewId = ref<string>('busking');

  const views = computed<DeskView[]>(() => showStore.document.desk?.views ?? DEFAULT_DESK_VIEWS);

  const activeView = computed(() => {
    const found = views.value.find((view) => view.id === activeViewId.value);
    return found ?? views.value[0] ?? DEFAULT_DESK_VIEWS[0]!;
  });

  const activePanes = computed<DeskPane[]>(() => activeView.value?.panes ?? []);

  watch(
    () => showStore.document.desk?.defaultViewId,
    (defaultId) => {
      if (defaultId && views.value.some((view) => view.id === defaultId)) {
        activeViewId.value = defaultId;
      }
    },
    { immediate: true }
  );

  function ensureDeskInDocument() {
    if (!showStore.document.desk) {
      showStore.document.desk = createDefaultDeskConfig();
      showStore.markDirty();
    }
  }

  function mutateActiveView(mutator: (view: DeskView) => void) {
    ensureDeskInDocument();
    const desk = showStore.document.desk!;
    const viewIndex = desk.views.findIndex((view) => view.id === activeViewId.value);
    if (viewIndex < 0) return;
    const view = { ...desk.views[viewIndex]!, panes: [...desk.views[viewIndex]!.panes] };
    mutator(view);
    desk.views = [...desk.views];
    desk.views[viewIndex] = view;
    showStore.markDirty();
  }

  function setActiveView(viewId: string) {
    if (!views.value.some((view) => view.id === viewId)) return;
    activeViewId.value = viewId;
  }

  function setActiveViewByIndex(index: number) {
    const view = views.value[index];
    if (view) setActiveView(view.id);
  }

  function saveActiveViewAsDefault() {
    ensureDeskInDocument();
    showStore.document.desk!.defaultViewId = activeViewId.value;
    showStore.markDirty();
  }

  function updatePaneRect(paneId: string, patch: Partial<DeskPaneRect>) {
    mutateActiveView((view) => {
      const paneIndex = view.panes.findIndex((pane) => pane.id === paneId);
      if (paneIndex < 0) return;
      const pane = view.panes[paneIndex]!;
      const nextRect = { ...pane.rect, ...patch };
      if (nextRect.x + nextRect.w > DESK_GRID_COLS) {
        nextRect.w = DESK_GRID_COLS - nextRect.x;
      }
      const updated = { ...pane, rect: nextRect };
      if (!validateDeskPane(updated)) return;
      view.panes[paneIndex] = updated;
    });
  }

  function addPane(windowType: DeskWindowType) {
    mutateActiveView((view) => {
      const id = `${windowType}-${Date.now()}`;
      view.panes.push({
        id,
        windowType,
        rect: { x: 0, y: 0, w: 6, h: 6 },
      });
    });
  }

  function removePane(paneId: string) {
    mutateActiveView((view) => {
      if (view.panes.length <= 1) return;
      view.panes = view.panes.filter((pane) => pane.id !== paneId);
    });
  }

  function saveDefaultViewPreference() {
    saveActiveViewAsDefault();
  }

  return {
    activeViewId,
    views,
    activeView,
    activePanes,
    setActiveView,
    setActiveViewByIndex,
    saveActiveViewAsDefault,
    updatePaneRect,
    addPane,
    removePane,
    saveDefaultViewPreference,
  };
});
