/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import type { DeskPane, DeskView } from '@softdmx/engine';
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

  function setActiveView(viewId: string) {
    if (!views.value.some((view) => view.id === viewId)) return;
    activeViewId.value = viewId;
  }

  function setActiveViewByIndex(index: number) {
    const view = views.value[index];
    if (view) setActiveView(view.id);
  }

  function ensureDeskInDocument() {
    if (!showStore.document.desk) {
      showStore.document.desk = createDefaultDeskConfig();
      showStore.markDirty();
    }
  }

  function saveActiveViewAsDefault() {
    ensureDeskInDocument();
    showStore.document.desk!.defaultViewId = activeViewId.value;
    showStore.markDirty();
  }

  return {
    activeViewId,
    views,
    activeView,
    activePanes,
    setActiveView,
    setActiveViewByIndex,
    saveActiveViewAsDefault,
  };
});
