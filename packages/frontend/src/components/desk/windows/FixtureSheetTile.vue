<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { ShowfileFixtureMapped } from '@softdmx/engine';
import { useSelectionStore } from 'src/stores/selection';
import { useGroupColors } from 'src/composables/useGroupColors';
import { groupColorStyle } from '@softdmx/engine';

const props = defineProps<{
  fixture: ShowfileFixtureMapped;
}>();

const selection = useSelectionStore();
const { fixtureGroup } = useGroupColors();

const isSelected = computed(() => selection.isFixtureSelected(props.fixture.fixtureName));
const groupInfo = computed(() => fixtureGroup(props.fixture.fixtureName));
const cardStyle = computed(() => groupColorStyle(groupInfo.value?.color));

function toggleSelection() {
  selection.toggleFixture(props.fixture.fixtureName);
}
</script>

<template>
  <div
    class="fixture-sheet-tile sdmx-focus-ring"
    :class="{
      selected: isSelected,
      'has-group': !!groupInfo,
    }"
    :style="cardStyle"
    :data-sdmx-info="`Fixture ${fixture.fixtureName}`"
    role="button"
    :aria-pressed="isSelected"
    tabindex="0"
    @click="toggleSelection"
    @keydown.enter="toggleSelection"
    @keydown.space.prevent="toggleSelection"
  >
    <div class="fixture-sheet-tile__header">
      <span class="sdmx-text-label ellipsis">{{ fixture.fixtureName }}</span>
      <q-icon
        :name="isSelected ? 'check_circle' : 'radio_button_unchecked'"
        size="xs"
        :class="isSelected ? 'fixture-sheet-tile__state--selected' : 'fixture-sheet-tile__state'"
      />
    </div>
    <div class="fixture-sheet-tile__meta ellipsis">{{ fixture.def.name }}</div>
  </div>
</template>

<style scoped>
.fixture-sheet-tile {
  display: grid;
  gap: var(--sdmx-space-2xs);
  text-align: left;
}

.fixture-sheet-tile__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sdmx-space-xs);
  min-width: 0;
}

.fixture-sheet-tile__meta {
  font-size: var(--sdmx-font-size-caption);
  color: var(--sdmx-color-text-muted);
}

.fixture-sheet-tile__state {
  color: var(--sdmx-color-text-muted);
}

.fixture-sheet-tile__state--selected {
  color: var(--sdmx-color-primary);
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
