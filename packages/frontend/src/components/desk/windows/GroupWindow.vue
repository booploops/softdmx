<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useDMXStore } from 'src/stores/dmx';
import { useSelectionStore } from 'src/stores/selection';
import { useGroupColors } from 'src/composables/useGroupColors';
import { groupColorStyle } from '@softdmx/engine';

const dmx = useDMXStore();
const selection = useSelectionStore();
const { groupColor } = useGroupColors();

const groups = computed(() => dmx.showfile?.groups || []);

function toggleGroup(name: string) {
  selection.toggleGroup(name);
}
</script>

<template>
  <div class="group-window">
    <div v-if="groups.length" class="fixture-sheet-grid">
      <div
        v-for="group in groups"
        :key="group.name"
        class="fixture-sheet-tile sdmx-focus-ring group-sheet-tile"
        :class="{ selected: selection.isGroupSelected(group.name), 'has-group': true }"
        :style="groupColorStyle(groupColor(group.name))"
        :data-sdmx-info="`Group ${group.name}`"
        role="button"
        :aria-pressed="selection.isGroupSelected(group.name)"
        tabindex="0"
        @click="toggleGroup(group.name)"
        @keydown.enter="toggleGroup(group.name)"
        @keydown.space.prevent="toggleGroup(group.name)"
      >
        <div class="group-sheet-tile__header">
          <span class="sdmx-text-label ellipsis">{{ group.name }}</span>
          <q-icon
            :name="selection.isGroupSelected(group.name) ? 'check_circle' : 'radio_button_unchecked'"
            size="xs"
            :class="selection.isGroupSelected(group.name) ? 'group-sheet-tile__state--selected' : 'group-sheet-tile__state'"
          />
        </div>
        <div class="group-sheet-tile__meta ellipsis">
          {{ group.fixtures.length }} fixture{{ group.fixtures.length === 1 ? '' : 's' }}
        </div>
      </div>
    </div>
    <div v-else class="tab-empty-state q-pa-lg text-center text-grey-5">
      <q-icon name="group_off" size="3rem" />
      <div class="q-mt-sm">No groups defined</div>
      <div class="text-caption">Create groups in Setup to select them here.</div>
    </div>
  </div>
</template>

<style scoped>
.group-window {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.group-sheet-tile {
  display: grid;
  gap: var(--sdmx-space-2xs);
  text-align: left;
}

.group-sheet-tile__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sdmx-space-xs);
  min-width: 0;
}

.group-sheet-tile__meta {
  font-size: var(--sdmx-font-size-caption);
  color: var(--sdmx-color-text-muted);
}

.group-sheet-tile__state {
  color: var(--sdmx-color-text-muted);
}

.group-sheet-tile__state--selected {
  color: var(--sdmx-color-primary);
}

.tab-empty-state {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
