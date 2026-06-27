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

const cueOptions = computed(() =>
  cueStore.cues.map((cue) => ({ label: cue.name, value: cue.id }))
);

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
        <q-input
          :model-value="executorStore.executor.defaultReleaseMs ?? 400"
          dense
          type="number"
          label="Global release ms"
          style="width: 170px"
          @update:model-value="(value) => executorStore.updateExecutor({ defaultReleaseMs: Number(value ?? 0) })"
        />
        <q-btn v-info="'desk.playback.pagePrev'" icon="navigate_before" dense flat @click="executorStore.previousPage" />
        <q-btn v-info="'desk.playback.pageNext'" icon="navigate_next" dense flat @click="executorStore.nextPage" />
        <q-btn v-info="'desk.playback.stopAll'" color="negative" dense unelevated label="Stop All" @click="executorStore.stopAll" />
      </div>
    </div>

    <div class="executor-grid">
      <q-card
        v-for="slot in executorStore.visibleSlots"
        :key="slot.id"
        class="slot-card"
        :class="{ active: executorStore.isSlotActive(slot.id), selected: executorStore.selectedSlotId === slot.id }"
        @click="executorStore.setSelectedSlot(slot.id)"
      >
        <q-card-section class="q-pb-sm">
          <div class="row items-center justify-between">
            <q-input
              :model-value="slot.name"
              dense
              filled
              class="slot-name-input"
              placeholder="Slot name"
              @click.stop
              @update:model-value="(name) => executorStore.updateSlot(slot.id, { name: String(name ?? '') })"
            />
            <q-badge :label="slot.mode ?? 'go'" color="primary" />
          </div>
          <q-select
            :model-value="slot.cueId"
            :options="cueOptions"
            dense
            emit-value
            map-options
            clearable
            label="Cue"
            @update:model-value="(cueId) => executorStore.assignSlot(slot.id, cueId ?? undefined)"
          />
          <div class="row q-col-gutter-sm q-mt-sm">
            <div class="col">
              <q-select
                :model-value="slot.mode ?? 'go'"
                :options="['go', 'toggle', 'flash', 'latch']"
                dense
                label="Mode"
                @update:model-value="(mode) => executorStore.updateSlot(slot.id, { mode })"
              />
            </div>
            <div class="col">
              <q-input
                :model-value="slot.fadeMs ?? 0"
                dense
                type="number"
                label="Fade ms"
                @update:model-value="(fadeMs) => executorStore.updateSlot(slot.id, { fadeMs: Number(fadeMs ?? 0) })"
              />
            </div>
            <div class="col">
              <q-input
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
            <q-slider
              :model-value="slot.level ?? 1"
              :min="0"
              :max="1"
              :step="0.01"
              label
              color="primary"
              @update:model-value="(value) => executorStore.setSlotLevel(slot.id, Number(value ?? 0))"
            />
          </div>
        </q-card-section>
        <q-card-actions align="between">
          <q-btn
            v-info="'desk.playback.go'"
            color="positive"
            label="GO"
            @click.stop="onSlotGoClick(slot)"
            @mousedown="slot.mode === 'flash' ? onSlotTrigger(slot) : undefined"
            @mouseup="onSlotRelease(slot)"
            @mouseleave="onSlotRelease(slot)"
          />
          <q-btn v-info="'desk.playback.stop'" color="negative" label="STOP" @click.stop="executorStore.stopSlot(slot.id)" />
        </q-card-actions>
      </q-card>
    </div>

    <div v-if="executorStore.submasters.length > 0" class="q-mt-lg">
      <div class="text-subtitle1 q-mb-sm">Submasters</div>
      <div class="submaster-grid">
        <q-card v-for="submaster in executorStore.submasters" :key="submaster.id">
          <q-card-section class="q-pb-sm">
            <div class="text-caption text-grey-5">{{ submaster.mode ?? 'cue-intensity' }}</div>
            <div class="text-subtitle2">{{ submaster.name }}</div>
          </q-card-section>
          <q-card-section>
            <q-slider
              :model-value="submaster.value"
              :min="0"
              :max="1"
              :step="0.01"
              label
              @update:model-value="(value) => executorStore.setSubmasterValue(submaster.id, Number(value ?? 0))"
            />
          </q-card-section>
        </q-card>
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
  &.active { border-color: var(--sdmx-color-positive); }
  &.selected { box-shadow: 0 0 0 1px var(--sdmx-color-accent); }
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
</style>
