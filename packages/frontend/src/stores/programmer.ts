/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { AttributeFeature } from '@softdmx/engine';

export type ProgrammerFeatureGroup = AttributeFeature | 'all';
export type ProgrammerStoreMode = 'store' | 'update' | 'merge' | 'remove';

export const PROGRAMMER_FEATURE_GROUPS: Array<{ id: ProgrammerFeatureGroup; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'dimmer', label: 'Dim' },
  { id: 'color', label: 'Color' },
  { id: 'position', label: 'Position' },
  { id: 'beam', label: 'Beam' },
  { id: 'shutter', label: 'Shutter' },
  { id: 'control', label: 'Control' },
];

export const useProgrammerStore = defineStore('programmer', () => {
  const activeFeatureGroup = ref<ProgrammerFeatureGroup>('all');
  const storeMode = ref<ProgrammerStoreMode>('store');
  const selectedPoolId = ref('default-pool');
  const selectedPoolSlot = ref(0);
  const highlightSelection = ref(false);

  function setFeatureGroup(group: ProgrammerFeatureGroup) {
    activeFeatureGroup.value = group;
  }

  function setStoreMode(mode: ProgrammerStoreMode) {
    storeMode.value = mode;
  }

  function attributeFilter(): AttributeFeature[] | undefined {
    if (activeFeatureGroup.value === 'all') return undefined;
    return [activeFeatureGroup.value];
  }

  return {
    activeFeatureGroup,
    storeMode,
    selectedPoolId,
    selectedPoolSlot,
    highlightSelection,
    setFeatureGroup,
    setStoreMode,
    attributeFilter,
  };
});
