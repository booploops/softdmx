/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

const STORAGE_KEY = 'softdmx-gridnode-overlay-visible';

export const useGridNodeOverlayStore = defineStore('gridnodeOverlay', () => {
  const overlayVisible = ref(false);
  const isAvailable = computed(() => Boolean(window.electronGridNode));

  function setVisible(visible: boolean): void {
    overlayVisible.value = visible;
    if (isAvailable.value) {
      localStorage.setItem(STORAGE_KEY, visible ? 'true' : 'false');
      window.electronGridNode!.setVisible(visible);
    }
  }

  function toggle(): void {
    setVisible(!overlayVisible.value);
  }

  function init(): void {
    if (!window.electronGridNode) return;

    const saved = localStorage.getItem(STORAGE_KEY);
    const initialVisible = saved === 'true';

    window.electronGridNode.onChanged((_event, visible) => {
      overlayVisible.value = visible;
    });

    void window.electronGridNode.getVisible()
      .then((visible) => {
        overlayVisible.value = visible;
      })
      .catch(() => {
        overlayVisible.value = initialVisible;
      });

    window.electronGridNode.setVisible(initialVisible);
  }

  return {
    overlayVisible,
    isAvailable,
    setVisible,
    toggle,
    init,
  };
});
