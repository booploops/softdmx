<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import VisualizerPanel from 'src/components/VisualizerPanel.vue';
import { useShowStore } from 'src/stores/show';
import { useSelectionStore } from 'src/stores/selection';

const showStore = useShowStore();
const selection = useSelectionStore();

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
    <VisualizerPanel compact :fixtures="fixtures" @select-fixture="onFixtureSelect" />
  </div>
</template>

<style scoped>
.plot-window {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
