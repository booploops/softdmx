<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { ExecutorSlot } from '@softdmx/engine';
import { useExecutorStore } from 'src/stores/executor';
import { SdmxButton, SdmxFader } from 'src/components/ui';

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
    :data-sdmx-info="`Playback slot: ${label}`"
  >
    <div class="playback-slot-label" :title="label">{{ label }}</div>
    <div class="playback-slot-fader">
      <SdmxFader
        v-model="level"
        vertical
        :show-value="false"
        color="primary"
      />
    </div>
    <SdmxButton
      label="GO"
      variant="primary"
      size="xs"
      :active="isActive"
      info="Trigger this playback slot"
      @click="onGoClick"
      @mousedown="onGoDown"
      @mouseup="onGoUp"
      @mouseleave="onGoUp"
      @touchstart.prevent="onGoDown"
      @touchend.prevent="onGoUp"
    />
    <SdmxButton
      label="STOP"
      variant="danger"
      size="xs"
      info="Stop this playback slot"
      @click="onStop"
    />
  </div>
</template>

<style scoped>
.playback-slot {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
  width: 100%;
}

:deep(.sdmx-fader__slider--vertical) {
  min-height: 42px;
}
</style>
