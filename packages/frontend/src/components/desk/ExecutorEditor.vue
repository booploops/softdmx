<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { SdmxIconButton } from 'src/components/ui';
import { computed } from 'vue';
import type { ExecutorSlot } from '@softdmx/engine';
import { useCueStore } from 'src/stores/cue';
import { useExecutorStore } from 'src/stores/executor';

import XCard from 'src/components/controls/XCard.vue';
import XInput from 'src/components/controls/XInput.vue';
import XButton from 'src/components/controls/XButton.vue';
import XSelect from 'src/components/controls/XSelect.vue';
import XSlider from 'src/components/controls/XSlider.vue';
import XChip from 'src/components/controls/XChip.vue';

const cueStore = useCueStore();
const executorStore = useExecutorStore();

const cueOptions = computed(() => [
  { label: 'None', value: '' },
  ...cueStore.cues.map((cue) => ({ label: cue.name, value: cue.id }))
]);

function onSlotTrigger(slot: ExecutorSlot) {
  executorStore.triggerSlot(slot.id);
  executorStore.setSelectedSlot(slot.id);
}

function onSlotRelease(slot: ExecutorSlot) {
  executorStore.releaseFlash(slot.id);
}

function onSlotGoClick(slot: ExecutorSlot) {
  if ((slot.mode ?? 'go') === 'flash') return;
  onSlotTrigger(slot);
}
</script>

<template>
  <div class="executor-editor q-pa-md">
    <div class="executor-toolbar row items-center justify-between q-mb-md">
      <div class="text-subtitle1">Executor Page {{ executorStore.activePage }} / {{ executorStore.pageCount }}</div>
      <div class="row items-center q-gutter-sm">
        <XInput
          :model-value="executorStore.executor.defaultReleaseMs ?? 400"
          dense
          type="number"
          label="Global release ms"
          style="width: 170px"
          @update:model-value="(value) => executorStore.updateExecutor({ defaultReleaseMs: Number(value ?? 0) })"
        />
        <SdmxIconButton
          size="sm"
          info-key="desk.playback.pagePrev"
          icon="chevron-left"
          @click="executorStore.previousPage"
        />
        <SdmxIconButton
          size="sm"
          info-key="desk.playback.pageNext"
          icon="chevron-right"
          @click="executorStore.nextPage"
        />
        <XButton
          v-info="'desk.playback.stopAll'"
          color="danger"
          size="sm"
          label="Stop All"
          @click="executorStore.stopAll"
        />
      </div>
    </div>

    <div class="executor-grid">
      <XCard
        v-for="slot in executorStore.visibleSlots"
        :key="slot.id"
        class="slot-card"
        :class="{ active: executorStore.isSlotActive(slot.id), selected: executorStore.selectedSlotId === slot.id }"
        @click="executorStore.setSelectedSlot(slot.id)"
      >
        <div class="q-pb-sm">
          <div class="row items-center justify-between">
            <XInput
              :model-value="slot.name"
              dense
              class="slot-name-input"
              placeholder="Slot name"
              @click.stop
              @update:model-value="(name) => executorStore.updateSlot(slot.id, { name: String(name ?? '') })"
            />
            <XChip :label="slot.mode ?? 'go'" color="primary" dense size="xs" />
          </div>
          <XSelect
            :model-value="slot.cueId ?? ''"
            :options="cueOptions"
            dense
            label="Cue"
            @update:model-value="(cueId) => executorStore.assignSlot(slot.id, cueId || undefined)"
          />
          <div class="row q-col-gutter-sm q-mt-sm">
            <div class="col">
              <XSelect
                :model-value="slot.mode ?? 'go'"
                :options="['go', 'toggle', 'flash', 'latch']"
                dense
                label="Mode"
                @update:model-value="(mode) => executorStore.updateSlot(slot.id, { mode })"
              />
            </div>
            <div class="col">
              <XInput
                :model-value="slot.fadeMs ?? 0"
                dense
                type="number"
                label="Fade ms"
                @update:model-value="(fadeMs) => executorStore.updateSlot(slot.id, { fadeMs: Number(fadeMs ?? 0) })"
              />
            </div>
            <div class="col">
              <XInput
                :model-value="slot.releaseMs ?? 400"
                dense
                type="number"
                label="Release ms"
                @update:model-value="(releaseMs) => executorStore.updateSlot(slot.id, { releaseMs: Number(releaseMs ?? 0) })"
              />
            </div>
          </div>
          <div class="q-mt-sm">
            <div class="text-caption text-grey-5">Executor level</div>
            <XSlider
              :model-value="slot.level ?? 1"
              :min="0"
              :max="1"
              :step="0.01"
              @update:model-value="(value) => executorStore.setSlotLevel(slot.id, Number(value ?? 0))"
            />
          </div>
        </div>
        <template #footer>
          <div class="row justify-between full-width">
            <XButton
              v-info="'desk.playback.go'"
              color="positive"
              size="md"
              label="GO"
              @click.stop="onSlotGoClick(slot)"
              @mousedown="slot.mode === 'flash' ? onSlotTrigger(slot) : undefined"
              @mouseup="onSlotRelease(slot)"
              @mouseleave="onSlotRelease(slot)"
            />
            <XButton
              v-info="'desk.playback.stop'"
              color="danger"
              size="md"
              label="STOP"
              @click.stop="executorStore.stopSlot(slot.id)"
            />
          </div>
        </template>
      </XCard>
    </div>

    <div
      v-if="executorStore.submasters.length > 0"
      class="q-mt-lg"
    >
      <div class="text-subtitle1 q-mb-sm">Submasters</div>
      <div class="submaster-grid">
        <XCard
          v-for="submaster in executorStore.submasters"
          :key="submaster.id"
        >
          <div class="q-pb-sm">
            <div class="text-caption text-grey-5">{{ submaster.mode ?? 'cue-intensity' }}</div>
            <div class="text-subtitle2">{{ submaster.name }}</div>
          </div>
          <div>
            <XSlider
              :model-value="submaster.value"
              :min="0"
              :max="1"
              :step="0.01"
              @update:model-value="(value) => executorStore.setSubmasterValue(submaster.id, Number(value ?? 0))"
            />
          </div>
        </XCard>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.executor-editor {
  width: 100%;
  box-sizing: border-box;
}

.executor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  width: 100%;
}

.slot-card {
  border: 1px solid var(--sdmx-color-border);

  &.active {
    border-color: var(--sdmx-color-positive);
  }

  &.selected {
    box-shadow: 0 0 0 1px var(--sdmx-color-accent);
  }
}

.slot-name-input {
  flex: 1 1 auto;
  min-width: 0;
}

.submaster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

:deep(.x-select) {
  min-width: 0 !important;
}
</style>
