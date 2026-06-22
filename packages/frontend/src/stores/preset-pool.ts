/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useShowStore } from './show';
import {
  resolvePresetIdFromPoolSlot,
  resolvePresetPool,
} from '@softdmx/engine';

export const usePresetPoolStore = defineStore('preset-pool', () => {
  const showStore = useShowStore();

  const pools = computed(() => showStore.document.presetPools ?? []);

  function poolById(poolId: string) {
    return resolvePresetPool(showStore.document, poolId);
  }

  function presetIdForSlot(poolId: string, slotIndex: number) {
    return resolvePresetIdFromPoolSlot(showStore.document, poolId, slotIndex);
  }

  function assignSlot(poolId: string, slotIndex: number, presetId: string | null) {
    showStore.updateDocument((doc) => {
      const pool = (doc.presetPools ?? []).find((entry) => entry.id === poolId);
      if (!pool) return;
      while (pool.slots.length <= slotIndex) {
        pool.slots.push('');
      }
      pool.slots[slotIndex] = presetId ?? '';
    });
  }

  return {
    pools,
    poolById,
    presetIdForSlot,
    assignSlot,
  };
});
