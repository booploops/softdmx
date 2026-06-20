<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { TouchControlType } from 'src/types/desk';
import { useTouchLayoutStore } from 'src/stores/touch-layout';
import { useShowStore } from 'src/stores/show';

const touchLayout = useTouchLayoutStore();
const showStore = useShowStore();

const palette: { type: TouchControlType; label: string }[] = [
  { type: 'grand-master', label: 'GM' },
  { type: 'blackout', label: 'Blackout' },
  { type: 'preset-button', label: 'Preset' },
  { type: 'executor-button', label: 'Executor' },
  { type: 'cue-go', label: 'Cue GO' },
  { type: 'audio-meter', label: 'Audio' },
];

function addPaletteControl(type: TouchControlType) {
  touchLayout.ensureTouchInDocument();
  const page = touchLayout.activePage;
  if (!page) return;

  if (type === 'preset-button') {
    const preset = showStore.document.presets[0];
    if (!preset) return;
    touchLayout.addPresetControl(preset.id, preset.name, preset.color);
    return;
  }
  if (type === 'executor-button') {
    const slot = showStore.document.executors?.[0]?.slots[0];
    if (!slot) return;
    touchLayout.addExecutorControl(slot.id, slot.name);
    return;
  }

  touchLayout.addControl({
    type,
    label: type,
    rect: { x: 0, y: page.controls.length + 1, w: 4, h: 1 },
  });
}

function rebuild() {
  touchLayout.rebuildFromShow();
}
</script>

<template>
  <div class="touch-layout-editor q-pa-md">
    <div class="row items-center q-mb-md q-gutter-sm">
      <div class="text-h6">Touch Layout</div>
      <q-space />
      <q-toggle v-model="touchLayout.editMode" label="Edit mode" />
      <q-btn flat label="Rebuild from show" @click="rebuild" />
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-8">
        <div
          v-if="touchLayout.activePage"
          class="touch-editor-canvas"
          :style="{
            gridTemplateColumns: `repeat(${touchLayout.activePage.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${touchLayout.activePage.rows}, minmax(40px, 1fr))`,
          }"
        >
          <div
            v-for="control in touchLayout.activePage.controls"
            :key="control.id"
            class="touch-editor-control"
            :style="{
              gridColumn: `${control.rect.x + 1} / span ${control.rect.w}`,
              gridRow: `${control.rect.y + 1} / span ${control.rect.h}`,
              backgroundColor: control.color,
            }"
          >
            <span>{{ control.label ?? control.type }}</span>
            <q-btn
              v-if="touchLayout.editMode"
              dense
              round
              flat
              size="xs"
              icon="close"
              class="touch-control-remove"
              @click="touchLayout.removeControl(control.id)"
            />
          </div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <div class="text-subtitle2 q-mb-sm">Add control</div>
        <div class="column q-gutter-xs">
          <q-btn
            v-for="item in palette"
            :key="item.type"
            dense
            outline
            :label="item.label"
            :disable="!touchLayout.editMode"
            @click="addPaletteControl(item.type)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.touch-editor-canvas {
  display: grid;
  gap: 6px;
  min-height: 360px;
  padding: 8px;
  border: 1px dashed var(--sdmx-color-border-strong);
  border-radius: var(--sdmx-radius-md);
  background: var(--sdmx-color-bg-page);
}
.touch-editor-control {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--sdmx-color-border);
  border-radius: var(--sdmx-radius-sm);
  font-weight: 700;
  font-size: 12px;
  min-height: 40px;
}
.touch-control-remove {
  position: absolute;
  top: 2px;
  right: 2px;
}
</style>
