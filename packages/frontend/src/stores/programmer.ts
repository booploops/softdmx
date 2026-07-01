/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { AttributeFeature, ConflictResolutionMode, StoreProfile } from '@softdmx/engine';
import { useShowStore } from './show';

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
  const showStore = useShowStore();

  const activeFeatureGroup = ref<ProgrammerFeatureGroup>('all');
  const storeMode = ref<ProgrammerStoreMode>('store');
  const selectedPoolId = ref('default-pool');
  const selectedPoolSlot = ref(0);
  const highlightSelection = ref(false);
  const activeAttributes = ref<Set<string>>(new Set());
  const activeAttributePath = ref<string | null>(null);
  const pinnedAttributePath = ref<string | null>(null);
  const scratchedOnly = ref(false);
  const activeOnly = ref(false);
  const operatorScope = ref<'mine' | 'all'>('all');

  const storeProfiles = computed<StoreProfile[]>(
    () => showStore.document.programmer?.storeProfiles ?? [],
  );
  const conflictMode = computed<ConflictResolutionMode>(
    () => showStore.document.programmer?.conflictMode ?? 'attribute-merge',
  );

  function setFeatureGroup(group: ProgrammerFeatureGroup) {
    activeFeatureGroup.value = group;
  }

  function setStoreMode(mode: ProgrammerStoreMode) {
    storeMode.value = mode;
  }

  function activateAttribute(path: string) {
    const next = new Set(activeAttributes.value);
    next.add(path);
    activeAttributes.value = next;
    activeAttributePath.value = path;
  }

  function deactivateAttribute(path: string) {
    const next = new Set(activeAttributes.value);
    next.delete(path);
    activeAttributes.value = next;
    if (activeAttributePath.value === path) {
      activeAttributePath.value = next.size > 0 ? [...next][0]! : null;
    }
  }

  function clearActiveAttributes() {
    activeAttributes.value = new Set();
    activeAttributePath.value = null;
  }

  function pinAttribute(path: string | null) {
    pinnedAttributePath.value = path;
  }

  function setActiveAttribute(path: string) {
    activateAttribute(path);
  }

  function clearActiveAttribute() {
    clearActiveAttributes();
  }

  function togglePinnedAttribute(path: string) {
    pinnedAttributePath.value = pinnedAttributePath.value === path ? null : path;
    activateAttribute(path);
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
    activeAttributes,
    activeAttributePath,
    pinnedAttributePath,
    scratchedOnly,
    activeOnly,
    operatorScope,
    storeProfiles,
    conflictMode,
    setFeatureGroup,
    setStoreMode,
    activateAttribute,
    deactivateAttribute,
    clearActiveAttributes,
    pinAttribute,
    setActiveAttribute,
    clearActiveAttribute,
    togglePinnedAttribute,
    attributeFilter,
  };
});
