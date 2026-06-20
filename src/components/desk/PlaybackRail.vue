<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import PlaybackSlot from './PlaybackSlot.vue';
import { useExecutorStore } from 'src/stores/executor';

const executorStore = useExecutorStore();
</script>

<template>
  <div class="playback-rail">
    <div class="playback-rail-inner">
      <div class="playback-rail-controls">
        <div class="text-caption text-weight-bold">
          Page {{ executorStore.activePage }}/{{ executorStore.pageCount }}
        </div>
        <q-btn dense flat icon="navigate_before" @click="executorStore.previousPage" />
        <q-btn dense flat icon="navigate_next" @click="executorStore.nextPage" />
        <q-btn dense flat color="primary" label="Go+" @click="executorStore.goActive()" />
        <q-btn dense flat color="negative" label="Stop" @click="executorStore.stopAll" />
      </div>

      <div class="playback-slots">
        <PlaybackSlot v-for="slot in executorStore.visibleSlots" :key="slot.id" :slot="slot" />
      </div>

      <div v-if="executorStore.submasters.length" class="playback-submasters row q-gutter-xs">
        <div v-for="sub in executorStore.submasters" :key="sub.id" class="playback-slot">
          <div class="playback-slot-label">{{ sub.name }}</div>
          <div class="playback-slot-fader">
            <q-slider
              :model-value="sub.value"
              :min="0"
              :max="1"
              :step="0.01"
              vertical
              reverse
              dense
              color="secondary"
              class="vertical-fader"
              @update:model-value="(v) => executorStore.setSubmasterValue(sub.id, Number(v ?? 0))"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playback-submasters {
  flex-shrink: 0;
  border-left: 1px solid var(--sdmx-color-border-subtle);
  padding-left: 8px;
}
</style>
