<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import FixtureSheetTile from './FixtureSheetTile.vue';
import { useDMXStore } from 'src/stores/dmx';

const dmx = useDMXStore();

const fixtures = computed(() => dmx.showfileFixturesMapped);
</script>

<template>
  <div class="fixture-sheet-window">
    <div v-if="fixtures.length" class="fixture-sheet-grid">
      <FixtureSheetTile
        v-for="fixture in fixtures"
        :key="fixture.fixtureName"
        :fixture="fixture"
      />
    </div>
    <div v-else class="tab-empty-state q-pa-lg text-center text-grey-5">
      <q-icon name="lightbulb_outline" size="3rem" />
      <div class="q-mt-sm">No fixtures patched</div>
      <div class="text-caption">Open Setup → Patch to add fixtures to select here.</div>
    </div>
  </div>
</template>

<style scoped>
.fixture-sheet-window {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-empty-state {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
}
</style>
