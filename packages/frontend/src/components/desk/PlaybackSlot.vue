<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { ExecutorSlot } from '@softdmx/engine';
import { useExecutorStore } from 'src/stores/executor';
import type { ExecutorRailSlot } from 'src/stores/executor';
import { SdmxButton, SdmxFader, SdmxValueField } from 'src/components/ui';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useInfoText } from 'src/composables/useInfoText';

const props = defineProps<{ slot: ExecutorRailSlot }>();
const executorStore = useExecutorStore();
const outputEngine = useOutputEngineStore();
const { info } = useInfoText();

function isGrandMasterSlot(slot: ExecutorRailSlot): slot is Extract<ExecutorRailSlot, { isGrandMaster: true }> {
  return 'isGrandMaster' in slot && slot.isGrandMaster === true;
}

const isGrandMaster = computed(() => isGrandMasterSlot(props.slot));
const isActive = computed(() => (isGrandMaster.value ? false : executorStore.isSlotActive(props.slot.id)));
const isFlash = computed(() => (!isGrandMaster.value && props.slot.mode === 'flash'));
const label = computed(() => (isGrandMaster.value ? 'GM' : executorStore.getSlotDisplayLabel(props.slot as ExecutorSlot)));

const level = computed({
  get: () => (isGrandMaster.value ? outputEngine.grandMaster : (props.slot.level ?? 1)),
  set: (value: number) => {
    if (isGrandMaster.value) {
      outputEngine.setGrandMaster(value);
      return;
    }
    executorStore.setSlotLevel(props.slot.id, value);
  },
});

function onGoPlusClick() {
  if (isGrandMaster.value) return;
  if ((props.slot.mode ?? 'go') === 'flash') return;
  executorStore.triggerSlot(props.slot.id);
}

function onGoPlusDown() {
  if (isGrandMaster.value) return;
  if ((props.slot.mode ?? 'go') !== 'flash') return;
  executorStore.triggerSlot(props.slot.id);
}

function onGoPlusUp() {
  if (isGrandMaster.value) return;
  if ((props.slot.mode ?? 'go') !== 'flash') return;
  executorStore.releaseFlash(props.slot.id);
}

function onGoMinusClick() {
  if (isGrandMaster.value) return;
  if ((props.slot.mode ?? 'go') === 'flash') {
    executorStore.releaseFlash(props.slot.id);
    return;
  }
  executorStore.stopSlot(props.slot.id);
}

function onStop() {
  if (isGrandMaster.value) return;
  executorStore.stopSlot(props.slot.id);
}

const gmPercent = computed(() => `${Math.round(outputEngine.grandMaster * 100)}%`);

function onFaderCommit(value: number) {
  if (isGrandMaster.value) {
    outputEngine.setGrandMaster(value, { flush: true });
  }
}
</script>

<template>
  <div
    class="playback-slot"
    :class="{ active: isActive, flash: isFlash && isActive }"
    :data-sdmx-info="info('desk.playback.slot', { label })"
  >
    <div class="playback-slot-label" :title="label">{{ label }}</div>
    <div class="playback-slot-fader">
      <SdmxFader
        v-model="level"
        vertical
        :show-value="false"
        :color="isGrandMaster ? 'orange' : 'primary'"
        :info="info('desk.playback.level')"
        @change="onFaderCommit"
      />
    </div>
    <template v-if="isGrandMaster">
      <SdmxValueField
        label=""
        :value="gmPercent"
        tone="warning"
        align="center"
      />
    </template>
    <template v-else>
      <div class="playback-slot-actions">
        <div class="playback-slot-go-row">
          <SdmxButton
            label="-"
            variant="secondary"
            size="sm"
            :info="info('desk.playback.goMinus')"
            @click="onGoMinusClick"
          />
          <SdmxButton
            label="+"
            variant="primary"
            size="sm"
            :active="isActive"
            :info="info('desk.playback.goPlus')"
            @click="onGoPlusClick"
            @mousedown="onGoPlusDown"
            @mouseup="onGoPlusUp"
            @mouseleave="onGoPlusUp"
            @touchstart.prevent="onGoPlusDown"
            @touchend.prevent="onGoPlusUp"
          />
        </div>
        <SdmxButton
          label="STOP"
          variant="danger"
          size="sm"
          :info="info('desk.playback.stop')"
          @click="onStop"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.playback-slot {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
  width: 100%;
}

.playback-slot-actions {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
  width: 100%;
}

.playback-slot-go-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sdmx-space-xs);
  width: 100%;
}

.playback-slot-go-row :deep(.x-btn) {
  width: 100%;
  min-width: 0;
  min-height: 24px;
  padding-inline: var(--sdmx-space-xs);
  justify-content: center;
}

.playback-slot-actions :deep(.x-btn) {
  width: 100%;
  min-width: 0;
  min-height: 24px;
  padding-inline: var(--sdmx-space-xs);
  justify-content: center;
}

:deep(.sdmx-fader__slider--vertical) {
  min-height: 42px;
}
</style>
