<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { ExecutorSlot } from '@softdmx/engine';
import { useExecutorStore } from 'src/stores/executor';

const props = defineProps<{ slot: ExecutorSlot }>();
const executorStore = useExecutorStore();

const isActive = computed(() => executorStore.isSlotActive(props.slot.id));
const isFlash = computed(() => props.slot.mode === 'flash');
const label = computed(() => executorStore.getSlotDisplayLabel(props.slot));

const level = computed({
  get: () => props.slot.level ?? 1,
  set: (value: number) => executorStore.setSlotLevel(props.slot.id, value),
});

function onGoClick() {
  if ((props.slot.mode ?? 'go') === 'flash') return;
  executorStore.triggerSlot(props.slot.id);
}

function onGoDown() {
  if ((props.slot.mode ?? 'go') !== 'flash') return;
  executorStore.triggerSlot(props.slot.id);
}

function onGoUp() {
  if ((props.slot.mode ?? 'go') !== 'flash') return;
  executorStore.releaseFlash(props.slot.id);
}

function onStop() {
  executorStore.stopSlot(props.slot.id);
}
</script>

<template>
  <div
    class="playback-slot"
    :class="{ active: isActive, flash: isFlash && isActive }"
  >
    <div class="playback-slot-label" :title="label">{{ label }}</div>
    <div class="playback-slot-fader">
      <q-slider
        v-model="level"
        :min="0"
        :max="1"
        :step="0.01"
        vertical
        reverse
        dense
        color="primary"
        track-color="grey-9"
        class="vertical-fader"
      />
    </div>
    <q-btn
      dense
      unelevated
      color="positive"
      label="GO"
      class="full-width"
      @click="onGoClick"
      @mousedown="onGoDown"
      @mouseup="onGoUp"
      @mouseleave="onGoUp"
      @touchstart.prevent="onGoDown"
      @touchend.prevent="onGoUp"
    />
    <q-btn dense flat color="negative" label="STOP" class="full-width" @click="onStop" />
  </div>
</template>

<style scoped>
.full-width {
  width: 100%;
  font-size: 10px;
  min-height: 24px;
}
</style>
