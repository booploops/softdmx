<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import VisualizerPanel from 'src/components/VisualizerPanel.vue';
import VisualizerPanel3D from 'src/components/VisualizerPanel3D.vue';
import { useShowStore } from 'src/stores/show';
import { useSelectionStore } from 'src/stores/selection';
import { SdmxButton } from 'src/components/ui';

const showStore = useShowStore();
const selection = useSelectionStore();
const viewMode = ref<'2d' | '3d'>('2d');

const fixtures = computed(() =>
  showStore.document.fixtures.map((f) => ({
    name: f.name,
    position: f.position,
  }))
);

function onFixtureSelect(name: string) {
  selection.toggleFixture(name);
}
</script>

<template>
  <div class="plot-window">
    <div class="plot-window__toolbar">
      <SdmxButton
        label="2D"
        size="sm"
        :variant="viewMode === '2d' ? 'primary' : 'ghost'"
        info="Top-down 2D plot view"
        @click="viewMode = '2d'"
      />
      <SdmxButton
        label="3D"
        size="sm"
        :variant="viewMode === '3d' ? 'primary' : 'ghost'"
        info="Real-time 3D stage visualizer"
        @click="viewMode = '3d'"
      />
    </div>
    <VisualizerPanel3D
      v-if="viewMode === '3d'"
      :fixtures="fixtures"
      @select-fixture="onFixtureSelect"
    />
    <VisualizerPanel
      v-else
      compact
      :fixtures="fixtures"
      @select-fixture="onFixtureSelect"
    />
  </div>
</template>

<style scoped>
.plot-window {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.plot-window__toolbar {
  display: flex;
  gap: var(--sdmx-space-xs);
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  flex-shrink: 0;
}
</style>
