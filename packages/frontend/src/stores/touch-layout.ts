/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import type { TouchControl, TouchPage } from 'src/types/desk';
import { useShowStore } from './show';
import { createDefaultTouchConfig } from 'src/utils/desk-defaults';

function newControlId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useTouchLayoutStore = defineStore('touch-layout', () => {
  const showStore = useShowStore();
  const activePageId = ref<string>('main');
  const editMode = ref(false);

  const pages = computed<TouchPage[]>(() => showStore.document.touch?.pages ?? []);

  const activePage = computed<TouchPage | null>(() => {
    const found = pages.value.find((page) => page.id === activePageId.value);
    return found ?? pages.value[0] ?? null;
  });

  watch(
    () => showStore.document.touch?.defaultPageId,
    (defaultId) => {
      if (defaultId && pages.value.some((page) => page.id === defaultId)) {
        activePageId.value = defaultId;
      } else if (pages.value[0]) {
        activePageId.value = pages.value[0].id;
      }
    },
    { immediate: true }
  );

  function ensureTouchInDocument() {
    if (!showStore.document.touch) {
      showStore.document.touch = createDefaultTouchConfig(showStore.document);
      showStore.markDirty();
    }
  }

  function setActivePageId(pageId: string) {
    if (pages.value.some((page) => page.id === pageId)) {
      activePageId.value = pageId;
    }
  }

  function addControl(control: Omit<TouchControl, 'id'> & { id?: string }) {
    ensureTouchInDocument();
    const page = activePage.value;
    if (!page) return;
    page.controls.push({
      ...control,
      id: control.id ?? newControlId('touch'),
    });
    showStore.markDirty();
  }

  function removeControl(controlId: string) {
    const page = activePage.value;
    if (!page) return;
    page.controls = page.controls.filter((control) => control.id !== controlId);
    showStore.markDirty();
  }

  function rebuildFromShow() {
    showStore.document.touch = createDefaultTouchConfig(showStore.document);
    activePageId.value = showStore.document.touch.defaultPageId ?? showStore.document.touch.pages[0]?.id ?? 'main';
    showStore.markDirty();
  }

  function addPresetControl(presetId: string, label: string, color?: string) {
    const existing = activePage.value?.controls.length ?? 0;
    const row = Math.floor(existing / 2) + 2;
    const col = (existing % 2) * 6;
    addControl({
      type: 'preset-button',
      presetId,
      label,
      color,
      rect: { x: col, y: row, w: 6, h: 1 },
    });
  }

  function addExecutorControl(slotId: string, label: string) {
    const index = activePage.value?.controls.filter((c) => c.type === 'executor-button').length ?? 0;
    addControl({
      type: 'executor-button',
      slotId,
      label,
      rect: { x: (index % 4) * 3, y: 10, w: 3, h: 1 },
    });
  }

  return {
    activePageId,
    editMode,
    pages,
    activePage,
    setActivePageId,
    addControl,
    removeControl,
    rebuildFromShow,
    addPresetControl,
    addExecutorControl,
    ensureTouchInDocument,
  };
});
