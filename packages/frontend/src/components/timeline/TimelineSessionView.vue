<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TimelineSessionViewSlot } from '@softdmx/engine';
import { useShowStore } from 'src/stores/show';
import { useCueStore } from 'src/stores/cue';
import { useTimelineEditorStore } from 'src/stores/timeline-editor';
import { useOutputEngineStore } from 'src/stores/output-playback';

const showStore = useShowStore();
const cueStore = useCueStore();
const timelineEditor = useTimelineEditorStore();
const outputEngine = useOutputEngineStore();

const selectedBrowserKind = ref<'cues' | 'presets'>('cues');
const dragPayload = ref<{ cueId?: string; presetId?: string; label: string } | null>(null);

function ensureSessionView() {
  showStore.updateDocument((doc) => {
    doc.timeline = doc.timeline ?? {};
    if (!doc.timeline.sessionView) {
      doc.timeline.sessionView = {
        rows: [{ id: 'scene-1', name: 'Scene 1' }],
        columns: [
          { id: 'col-main', name: 'Main', trackId: 'timeline-main-track' },
          { id: 'col-presets', name: 'Presets' },
        ],
        slots: [],
      };
    }
  });
}

ensureSessionView();

const sessionView = computed(() => timelineEditor.sessionView);

const cueOptions = computed(() =>
  showStore.document.cues.map((cue) => ({
    id: cue.id,
    label: cue.name,
    kind: 'cue' as const,
  }))
);

const presetOptions = computed(() =>
  (showStore.document.presets ?? []).map((preset) => ({
    id: preset.id,
    label: preset.name,
    kind: 'preset' as const,
  }))
);

const browserItems = computed(() =>
  selectedBrowserKind.value === 'cues' ? cueOptions.value : presetOptions.value
);

function slotAt(rowId: string, columnId: string): TimelineSessionViewSlot | null {
  return sessionView.value?.slots.find((slot) => slot.rowId === rowId && slot.columnId === columnId) ?? null;
}

function slotLabel(slot: TimelineSessionViewSlot | null) {
  if (!slot) return '';
  if (slot.label) return slot.label;
  if (slot.cueId) {
    return showStore.document.cues.find((cue) => cue.id === slot.cueId)?.name ?? 'Cue';
  }
  if (slot.presetId) {
    return showStore.document.presets?.find((preset) => preset.id === slot.presetId)?.name ?? 'Preset';
  }
  return '';
}

function setSlot(rowId: string, columnId: string, next: Partial<TimelineSessionViewSlot> | null) {
  showStore.updateDocument((doc) => {
    if (!doc.timeline?.sessionView) return;
    const slots = doc.timeline.sessionView.slots ?? [];
    const index = slots.findIndex((slot) => slot.rowId === rowId && slot.columnId === columnId);
    if (!next) {
      if (index >= 0) slots.splice(index, 1);
      return;
    }
    const payload: TimelineSessionViewSlot = {
      rowId,
      columnId,
      cueId: next.cueId,
      presetId: next.presetId,
      label: next.label,
      color: next.color,
      mode: next.mode ?? 'go',
    };
    if (index >= 0) slots[index] = payload;
    else slots.push(payload);
    doc.timeline.sessionView.slots = slots;
  });
}

function onBrowserDragStart(item: { id: string; label: string; kind: 'cue' | 'preset' }) {
  dragPayload.value =
    item.kind === 'cue'
      ? { cueId: item.id, label: item.label }
      : { presetId: item.id, label: item.label };
}

function onCellDrop(rowId: string, columnId: string) {
  if (!dragPayload.value) return;
  setSlot(rowId, columnId, {
    cueId: dragPayload.value.cueId,
    presetId: dragPayload.value.presetId,
    label: dragPayload.value.label,
    mode: 'go',
  });
  dragPayload.value = null;
}

function launchSlot(slot: TimelineSessionViewSlot | null) {
  if (!slot) return;
  if (slot.cueId) {
    if (slot.mode === 'toggle') {
      const state = outputEngine.playbackStates.get(slot.cueId);
      const isActive = Boolean(state?.isPlaying);
      if (isActive) cueStore.stopCue(slot.cueId);
      else cueStore.playCue(slot.cueId);
      return;
    }
    cueStore.playCue(slot.cueId);
    return;
  }
  if (slot.presetId) cueStore.firePreset(slot.presetId);
}

function launchRow(rowId: string) {
  const slots = (sessionView.value?.slots ?? []).filter((slot) => slot.rowId === rowId);
  for (const slot of slots) launchSlot(slot);
}

function addRow() {
  showStore.updateDocument((doc) => {
    if (!doc.timeline?.sessionView) return;
    const index = doc.timeline.sessionView.rows.length + 1;
    doc.timeline.sessionView.rows.push({
      id: `scene-${Date.now().toString(36)}`,
      name: `Scene ${index}`,
    });
  });
}

function addColumn() {
  showStore.updateDocument((doc) => {
    if (!doc.timeline?.sessionView) return;
    const index = doc.timeline.sessionView.columns.length + 1;
    doc.timeline.sessionView.columns.push({
      id: `col-${Date.now().toString(36)}`,
      name: `Column ${index}`,
    });
  });
}

function renameRow(rowId: string, name: string) {
  showStore.updateDocument((doc) => {
    const row = doc.timeline?.sessionView?.rows.find((entry) => entry.id === rowId);
    if (row) row.name = name;
  });
}
</script>

<template>
  <div class="timeline-session-view">
    <div class="timeline-session-view__toolbar">
      <div class="timeline-session-view__title">Session View</div>
      <XButton
        flat
        size="sm"
        icon="plus"
        label="Scene row"
        @click="addRow"
      />
      <XButton
        flat
        size="sm"
        icon="plus"
        label="Column"
        @click="addColumn"
      />
    </div>

    <div class="timeline-session-view__body">
      <aside class="timeline-session-view__browser">
        <XButtonGroup size="sm">
          <XButton
            :color="selectedBrowserKind === 'cues' ? 'primary' : 'default'"
            label="Cues"
            @click="selectedBrowserKind = 'cues'"
          />
          <XButton
            :color="selectedBrowserKind === 'presets' ? 'primary' : 'default'"
            label="Presets"
            @click="selectedBrowserKind = 'presets'"
          />
        </XButtonGroup>
        <div class="timeline-session-view__browser-list">
          <button
            v-for="item in browserItems"
            :key="`${item.kind}-${item.id}`"
            type="button"
            class="timeline-session-view__browser-item"
            draggable="true"
            @dragstart="onBrowserDragStart(item)"
          >
            {{ item.label }}
          </button>
          <div
            v-if="browserItems.length === 0"
            class="timeline-session-view__empty"
          >
            No {{ selectedBrowserKind }} available
          </div>
        </div>
      </aside>

      <div class="timeline-session-view__grid-wrap">
        <table
          v-if="sessionView"
          class="timeline-session-view__grid"
        >
          <thead>
            <tr>
              <th class="timeline-session-view__corner">Scene</th>
              <th
                v-for="column in sessionView.columns"
                :key="column.id"
              >
                {{ column.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in sessionView.rows"
              :key="row.id"
            >
              <th>
                <div class="timeline-session-view__row-head">
                  <XInput
                    :model-value="row.name"
                    dense
                    @update:model-value="(value) => renameRow(row.id, String(value))"
                  />
                  <XButton
                    flat
                    size="sm"
                    icon="player-play-filled"
                    @click="launchRow(row.id)"
                  />
                </div>
              </th>
              <td
                v-for="column in sessionView.columns"
                :key="`${row.id}-${column.id}`"
                class="timeline-session-view__cell"
                @dragover.prevent
                @drop.prevent="onCellDrop(row.id, column.id)"
              >
                <button
                  v-if="slotAt(row.id, column.id)"
                  type="button"
                  class="timeline-session-view__clip"
                  @click="launchSlot(slotAt(row.id, column.id))"
                  @dblclick="setSlot(row.id, column.id, null)"
                >
                  {{ slotLabel(slotAt(row.id, column.id)) }}
                </button>
                <div
                  v-else
                  class="timeline-session-view__slot-empty"
                >
                  Drop cue/preset
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-session-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--sdmx-color-bg-surface);
  color: var(--sdmx-color-text);
}

.timeline-session-view__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-toolbar);
}

.timeline-session-view__title {
  font-weight: 600;
  margin-right: 8px;
}

.timeline-session-view__body {
  display: flex;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

.timeline-session-view__browser {
  width: 220px;
  border-right: 1px solid var(--sdmx-color-border-subtle);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--sdmx-color-bg-elevated);
}

.timeline-session-view__browser-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: auto;
}

.timeline-session-view__browser-item {
  text-align: left;
  border: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-surface);
  color: inherit;
  border-radius: var(--sdmx-radius-sm);
  padding: 8px 10px;
  cursor: grab;
}

.timeline-session-view__grid-wrap {
  flex: 1 1 0;
  overflow: auto;
  padding: 12px;
}

.timeline-session-view__grid {
  border-collapse: separate;
  border-spacing: 8px;
  min-width: 100%;
}

.timeline-session-view__grid th,
.timeline-session-view__grid td {
  vertical-align: middle;
}

.timeline-session-view__corner {
  width: 180px;
}

.timeline-session-view__row-head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 180px;
}

.timeline-session-view__cell {
  min-width: 140px;
  height: 64px;
  border: 1px dashed var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  background: color-mix(in srgb, var(--sdmx-color-bg-inset) 80%, transparent);
  padding: 4px;
}

.timeline-session-view__clip {
  width: 100%;
  height: 100%;
  border: 1px solid color-mix(in srgb, var(--sdmx-color-primary) 50%, var(--sdmx-color-border-subtle));
  border-radius: var(--sdmx-radius-sm);
  background: color-mix(in srgb, var(--sdmx-color-primary) 18%, var(--sdmx-color-bg-surface));
  color: inherit;
  font-weight: 600;
  cursor: pointer;
}

.timeline-session-view__slot-empty,
.timeline-session-view__empty {
  font-size: 12px;
  color: var(--sdmx-color-text-faint);
  text-align: center;
}
</style>
