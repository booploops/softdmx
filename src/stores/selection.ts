/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { AlignMode, WingDirection } from 'src/engine/align-wings';

export const useSelectionStore = defineStore('selection', () => {
  const selectedFixtures = ref<Set<string>>(new Set());
  const selectedGroups = ref<Set<string>>(new Set());
  const alignMode = ref<AlignMode>('none');
  const wings = ref(0);
  const wingDirection = ref<WingDirection>('out');

  const hasSelection = computed(
    () => selectedFixtures.value.size > 0 || selectedGroups.value.size > 0
  );

  function selectFixture(name: string) {
    selectedFixtures.value.add(name);
  }

  function deselectFixture(name: string) {
    selectedFixtures.value.delete(name);
  }

  function toggleFixture(name: string) {
    if (selectedFixtures.value.has(name)) {
      selectedFixtures.value.delete(name);
    } else {
      selectedFixtures.value.add(name);
    }
  }

  function selectGroup(name: string) {
    selectedGroups.value.add(name);
  }

  function deselectGroup(name: string) {
    selectedGroups.value.delete(name);
  }

  function toggleGroup(name: string) {
    if (selectedGroups.value.has(name)) {
      selectedGroups.value.delete(name);
    } else {
      selectedGroups.value.add(name);
    }
  }

  function clearSelection() {
    selectedFixtures.value.clear();
    selectedGroups.value.clear();
  }

  function isFixtureSelected(name: string) {
    return selectedFixtures.value.has(name);
  }

  function isGroupSelected(name: string) {
    return selectedGroups.value.has(name);
  }

  return {
    selectedFixtures,
    selectedGroups,
    alignMode,
    wings,
    wingDirection,
    hasSelection,
    selectFixture,
    deselectFixture,
    toggleFixture,
    selectGroup,
    deselectGroup,
    toggleGroup,
    clearSelection,
    isFixtureSelected,
    isGroupSelected,
  };
});
