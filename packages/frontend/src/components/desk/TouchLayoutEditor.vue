<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { TouchControl, TouchControlType } from '@softdmx/engine';
import { useTouchLayoutStore } from 'src/stores/touch-layout';
import { useShowStore } from 'src/stores/show';
import { SdmxButton, SdmxToggle } from 'src/components/ui';
import { useInfoText } from 'src/composables/useInfoText';
import type { TooltipKey } from 'src/lib/info-text';

const touchLayout = useTouchLayoutStore();
const showStore = useShowStore();
const { info } = useInfoText();

const showMode = ref(true);
const canvasRef = ref<HTMLElement | null>(null);
const dragState = ref<{ controlId: string; startX: number; startY: number; originX: number; originY: number } | null>(null);

const palette: { type: TouchControlType; label: string; infoKey: TooltipKey }[] = [
  { type: 'grand-master', label: 'GM', infoKey: 'desk.touchEditor.addGm' },
  { type: 'blackout', label: 'Blackout', infoKey: 'desk.touchEditor.addBlackout' },
  { type: 'preset-button', label: 'Preset', infoKey: 'desk.touchEditor.addPreset' },
  { type: 'executor-button', label: 'Executor', infoKey: 'desk.touchEditor.addExecutor' },
  { type: 'cue-go', label: 'Cue GO', infoKey: 'desk.touchEditor.addCueGo' },
  { type: 'audio-meter', label: 'Audio', infoKey: 'desk.touchEditor.addAudio' },
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

function onControlPointerDown(event: PointerEvent, control: TouchControl) {
  if (!showMode.value) return;
  event.preventDefault();
  dragState.value = {
    controlId: control.id,
    startX: event.clientX,
    startY: event.clientY,
    originX: control.rect.x,
    originY: control.rect.y,
  };
  window.addEventListener('pointermove', onControlPointerMove);
  window.addEventListener('pointerup', onControlPointerUp);
}

function onControlPointerMove(event: PointerEvent) {
  if (!dragState.value || !touchLayout.activePage || !canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const page = touchLayout.activePage;
  const styles = window.getComputedStyle(canvasRef.value);
  const gap = Number.parseFloat(styles.gap || '0') || 0;
  const cellW = Math.max(1, (rect.width - gap * (page.cols - 1)) / page.cols);
  const cellH = Math.max(1, (rect.height - gap * (page.rows - 1)) / page.rows);
  const deltaX = Math.round((event.clientX - dragState.value.startX) / cellW);
  const deltaY = Math.round((event.clientY - dragState.value.startY) / cellH);
  const control = page.controls.find((entry) => entry.id === dragState.value!.controlId);
  if (!control) return;
  const maxX = page.cols - control.rect.w;
  const maxY = page.rows - control.rect.h;
  touchLayout.moveControl(control.id, {
    x: Math.max(0, Math.min(maxX, dragState.value.originX + deltaX)),
    y: Math.max(0, Math.min(maxY, dragState.value.originY + deltaY)),
  });
}

function onControlPointerUp() {
  dragState.value = null;
  window.removeEventListener('pointermove', onControlPointerMove);
  window.removeEventListener('pointerup', onControlPointerUp);
}

onBeforeUnmount(onControlPointerUp);
</script>

<template>
  <div class="touch-layout-editor q-pa-md">
    <div class="touch-layout-editor__header">
      <div class="sdmx-text-title">Show Mode / Touch Layout</div>
      <q-space />
      <SdmxToggle v-model="showMode" label="Show Mode" :info="info('desk.touchEditor.showMode')" />
      <SdmxToggle v-model="touchLayout.editMode" label="Edit mode" :info="info('desk.touchEditor.editMode')" />
      <SdmxButton label="Rebuild from show" variant="ghost" :info="info('desk.touchEditor.rebuild')" @click="rebuild" />
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-8">
        <div
          v-if="touchLayout.activePage"
          ref="canvasRef"
          class="touch-editor-canvas"
          :class="{ 'touch-editor-canvas--show-mode': showMode }"
          :style="{
            gridTemplateColumns: `repeat(${touchLayout.activePage.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${touchLayout.activePage.rows}, minmax(40px, 1fr))`,
          }"
        >
          <div
            v-for="control in touchLayout.activePage.controls"
            :key="control.id"
            class="touch-editor-control sdmx-touch-target"
            :class="{ 'touch-editor-control--dragging': dragState?.controlId === control.id }"
            :style="{
              gridColumn: `${control.rect.x + 1} / span ${control.rect.w}`,
              gridRow: `${control.rect.y + 1} / span ${control.rect.h}`,
              backgroundColor: control.color ?? 'var(--sdmx-color-bg-elevated)',
            }"
            @pointerdown="onControlPointerDown($event, control)"
          >
            <span>{{ control.label ?? control.type }}</span>
            <SdmxButton
              v-if="touchLayout.editMode"
              icon="close"
              round
              size="sm"
              variant="ghost"
              class="touch-control-remove"
              :info="info('desk.touchEditor.removeControl')"
              @click.stop="touchLayout.removeControl(control.id)"
            />
          </div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <div class="sdmx-text-label q-mb-sm">Add control</div>
        <div class="column q-gutter-xs">
          <SdmxButton
            v-for="item in palette"
            :key="item.type"
            :label="item.label"
            size="sm"
            :disabled="!touchLayout.editMode"
            :info="info(item.infoKey)"
            @click="addPaletteControl(item.type)"
          />
        </div>
        <p class="sdmx-text-caption q-mt-md">
          Show Mode enables drag-to-reposition; Edit mode additionally enables add/remove controls.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.touch-layout-editor__header {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
  margin-bottom: var(--sdmx-space-md);
  flex-wrap: wrap;
}

.touch-editor-canvas {
  display: grid;
  gap: var(--sdmx-space-xs);
  min-height: 360px;
  padding: var(--sdmx-space-sm);
  border: 1px dashed var(--sdmx-color-border-strong);
  border-radius: var(--sdmx-radius-md);
  background: var(--sdmx-color-bg-page);
}

.touch-editor-canvas--show-mode {
  border-style: solid;
  border-color: var(--sdmx-color-primary-soft);
}

.touch-editor-control {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--sdmx-color-border);
  border-radius: var(--sdmx-radius-sm);
  font-weight: var(--sdmx-font-weight-bold);
  font-size: var(--sdmx-font-size-label);
  user-select: none;
  touch-action: none;
  transition: box-shadow var(--sdmx-motion-duration-fast) var(--sdmx-motion-easing);
}

.touch-editor-control--dragging {
  box-shadow: var(--sdmx-elevation-md);
  z-index: 2;
  cursor: grabbing;
}

.touch-editor-canvas--show-mode .touch-editor-control {
  cursor: grab;
}

.touch-control-remove {
  position: absolute;
  top: 2px;
  right: 2px;
}
</style>
