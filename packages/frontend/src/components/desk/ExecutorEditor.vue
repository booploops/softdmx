<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed } from 'vue';
import type { ExecutorSlot } from '@softdmx/engine';
import { useCueStore } from 'src/stores/cue';
import { useExecutorStore } from 'src/stores/executor';

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
  <div class="executor-editor">
    <div class="executor-toolbar">
      <div class="text-subtitle1">Executor Page {{ executorStore.activePage }} / {{ executorStore.pageCount }}</div>
      <div class="executor-toolbar__actions">
        <XInput
          :model-value="executorStore.executor.defaultReleaseMs ?? 400"
          type="number"
          label="Global release ms"
          style="width: 170px"
          @update:model-value="(value) => executorStore.updateExecutor({ defaultReleaseMs: Number(value ?? 0) })"
        />
        <XButton
          v-info="'desk.playback.pagePrev'"
          size="sm"
          flat
          icon="chevron-left"
          @click="executorStore.previousPage"
        />
        <XButton
          v-info="'desk.playback.pageNext'"
          size="sm"
          flat
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
        <div class="slot-card__body">
          <div class="slot-card__title-row">
            <XInput
              :model-value="slot.name"
              class="slot-name-input"
              placeholder="Slot name"
              @click.stop
              @update:model-value="(name) => executorStore.updateSlot(slot.id, { name: String(name ?? '') })"
            />
            <XChip
              class="slot-mode-chip"
              :label="slot.mode ?? 'go'"
              color="primary"
              dense
              size="xs"
            />
          </div>
          <XSelect
            :model-value="slot.cueId ?? ''"
            :options="cueOptions"
            label="Cue"
            @update:model-value="(cueId) => executorStore.assignSlot(slot.id, cueId || undefined)"
          />
          <div class="slot-card__fields">
            <XSelect
              :model-value="slot.mode ?? 'go'"
              :options="['go', 'toggle', 'flash', 'latch']"
              label="Mode"
              @update:model-value="(mode) => executorStore.updateSlot(slot.id, { mode })"
            />
            <XInput
              :model-value="slot.fadeMs ?? 0"
              type="number"
              label="Fade ms"
              @update:model-value="(fadeMs) => executorStore.updateSlot(slot.id, { fadeMs: Number(fadeMs ?? 0) })"
            />
            <XInput
              :model-value="slot.releaseMs ?? 400"
              type="number"
              label="Release ms"
              @update:model-value="(releaseMs) => executorStore.updateSlot(slot.id, { releaseMs: Number(releaseMs ?? 0) })"
            />
          </div>
          <div class="slot-card__level">
            <div class="slot-card__level-label">Executor level</div>
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
          <div class="slot-card__footer">
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
      class="submasters"
    >
      <div class="text-subtitle1 submasters__title">Submasters</div>
      <div class="submaster-grid">
        <XCard
          v-for="submaster in executorStore.submasters"
          :key="submaster.id"
        >
          <div class="submaster-card__meta">
            <div class="submaster-card__mode">{{ submaster.mode ?? 'cue-intensity' }}</div>
            <div class="text-subtitle2">{{ submaster.name }}</div>
          </div>
          <XSlider
            :model-value="submaster.value"
            :min="0"
            :max="1"
            :step="0.01"
            @update:model-value="(value) => executorStore.setSubmasterValue(submaster.id, Number(value ?? 0))"
          />
        </XCard>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.executor-editor {
  width: 100%;
  box-sizing: border-box;
  padding: var(--sdmx-space-md, 16px);
}

.executor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.executor-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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

.slot-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 8px;
}

.slot-card__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.slot-card__fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.slot-card__level-label {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
  margin-bottom: 4px;
}

.slot-card__footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
}

.slot-name-input {
  flex: 1 1 auto;
  min-width: 0;
}

.slot-mode-chip {
  flex-shrink: 0;
}

.submasters {
  margin-top: 24px;
}

.submasters__title {
  margin-bottom: 8px;
}

.submaster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.submaster-card__meta {
  margin-bottom: 8px;
}

.submaster-card__mode {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
}

:deep(.x-select) {
  min-width: 0 !important;
}
</style>
