<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import WidgetContainer from 'src/components/WidgetContainer.vue';
import GroupWidgetContainer from 'src/components/GroupWidgetContainer.vue';
import { useDMXStore } from 'src/stores/dmx';
import { useUIStore } from 'src/stores/ui';
import { useSelectionStore } from 'src/stores/selection';

const dmx = useDMXStore();
const ui = useUIStore();
const selection = useSelectionStore();

const groups = computed(() => dmx.showfile?.groups || []);
const hasFixtures = computed(() => dmx.showfileFixturesMapped.length > 0);

const showGroupWidgets = computed(
  () => groups.value.length > 0 && ui.widgetsViewMode === 'groups'
);

const ungroupedFixtures = computed(() => {
  const grouped = new Set(groups.value.flatMap((g) => g.fixtures));
  return dmx.showfileFixturesMapped.filter((f) => !grouped.has(f.fixtureName));
});

const selectedFixtures = computed(() => {
  if (!selection.hasSelection) return dmx.showfileFixturesMapped;
  return dmx.showfileFixturesMapped.filter((f) => selection.isFixtureSelected(f.fixtureName));
});

const selectedGroups = computed(() => {
  if (!selection.hasSelection) return groups.value;
  return groups.value.filter((g) => selection.isGroupSelected(g.name));
});
</script>

<template>
  <div class="widget-window">
    <div class="widget-window-toolbar row items-center q-px-sm q-py-xs">
      <q-btn-toggle
        v-if="groups.length"
        :model-value="ui.widgetsViewMode"
        :options="[
          { label: 'Groups', value: 'groups' },
          { label: 'Fixtures', value: 'individual' },
        ]"
        dense
        toggle-color="primary"
        @update:model-value="ui.setWidgetsViewMode"
      />
      <q-space />
      <span v-if="selection.hasSelection" class="text-caption text-grey-5">Selection filter active</span>
    </div>
    <div v-if="hasFixtures" class="widget-window-scroll q-pa-sm">
      <template v-if="showGroupWidgets">
        <GroupWidgetContainer
          v-for="group in selectedGroups"
          :key="group.name"
          :group="group"
        />
        <WidgetContainer
          v-for="fixture in ungroupedFixtures.filter((f) => !selection.hasSelection || selection.isFixtureSelected(f.fixtureName))"
          :key="fixture.fixtureName"
          :fixture="fixture"
        />
      </template>
      <template v-else>
        <WidgetContainer
          v-for="fixture in selectedFixtures"
          :key="fixture.fixtureName"
          :fixture="fixture"
        />
      </template>
    </div>
    <div v-else class="q-pa-lg text-center text-grey-5">No fixtures patched</div>
  </div>
</template>

<style scoped>
.widget-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.widget-window-toolbar {
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  flex-shrink: 0;
}
.widget-window-scroll {
  flex: 1 1 auto;
  overflow: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-content: flex-start;
}
</style>
