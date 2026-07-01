/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useProgrammerStore } from 'src/stores/programmer';
import { useScratchStore } from 'src/stores/scratch';

export function useActiveAttribute() {
  const programmer = useProgrammerStore();
  const scratch = useScratchStore();
  const {
    activeAttributePath,
    pinnedAttributePath,
  } = storeToRefs(programmer);

  const activeEntry = computed(() => {
    const path = activeAttributePath.value;
    if (!path) return undefined;
    return scratch.entries.get(path);
  });

  const activeAttributeName = computed(() => {
    if (!activeAttributePath.value) return null;
    const entry = scratch.entries.get(activeAttributePath.value);
    if (entry?.attributeName) return entry.attributeName;
    const parts = activeAttributePath.value.split('/');
    return parts[parts.length - 1] ?? activeAttributePath.value;
  });

  const isPinned = computed(() => {
    const path = activeAttributePath.value;
    return Boolean(path && pinnedAttributePath.value === path);
  });

  function setActive(path: string) {
    programmer.setActiveAttribute(path);
  }

  function clearActive() {
    programmer.clearActiveAttribute();
  }

  function togglePin(path?: string) {
    const target = path ?? activeAttributePath.value;
    if (!target) return;
    programmer.togglePinnedAttribute(target);
  }

  function isActive(path: string): boolean {
    return activeAttributePath.value === path;
  }

  function isPathPinned(path: string): boolean {
    return pinnedAttributePath.value === path;
  }

  return {
    activeAttributePath,
    pinnedAttributePath,
    activeAttributeName,
    activeEntry,
    isPinned,
    setActive,
    clearActive,
    togglePin,
    isActive,
    isPathPinned,
  };
}
