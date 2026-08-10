<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { Preset } from '@softdmx/engine';
import { SdmxButton, SdmxEmptyState, SdmxStatusChip } from 'src/components/ui';
import { useInfoText } from 'src/composables/useInfoText';
import { useCueStore } from 'src/stores/cue';
import { useShowStore } from 'src/stores/show';
import { computed, ref, watch } from 'vue';
import PresetEditor from './PresetEditor.vue';

const showStore = useShowStore();
const cueStore = useCueStore();
const { info } = useInfoText();

const presets = computed(() => showStore.document.presets);
const showPresetEditor = ref(false);
const editorPresetId = ref<string | null>(null);
const selectedPresetId = ref<string | null>(null);

watch(
  presets,
  (next) => {
    if (!next.length) {
      selectedPresetId.value = null;
      return;
    }
    if (!selectedPresetId.value || !next.some((preset) => preset.id === selectedPresetId.value)) {
      selectedPresetId.value = next[0]?.id ?? null;
    }
  },
  { immediate: true },
);

function selectPreset(presetId: string) {
  selectedPresetId.value = presetId;
}

function firePreset(presetId: string) {
  cueStore.firePreset(presetId);
}

function openEditor(presetId?: string) {
  editorPresetId.value = presetId ?? selectedPresetId.value;
  showPresetEditor.value = true;
  // Avoid focus returning to the card with a visible focus ring after Esc closes the dialog.
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

function onPresetActivate(preset: Preset) {
  openEditor(preset.id);
}

function closeEditor() {
  showPresetEditor.value = false;
  editorPresetId.value = null;
}

function targetSummary(preset: Preset): string {
  const count = preset.targets.length;
  return `${count} target${count === 1 ? '' : 's'}`;
}
</script>

<template>
  <div class="preset-panel">
    <div class="preset-panel__header">
      <div class="text-h6">Presets</div>
      <div class="preset-panel__actions">
        <SdmxButton
          variant="ghost"
          icon="pencil"
          label="Edit presets"
          info="program.presets.editPreset"
          @click="openEditor()"
        />
      </div>
    </div>

    <div
      v-if="presets.length"
      class="preset-panel__grid"
    >
      <div
        v-for="preset in presets"
        :key="preset.id"
        role="button"
        tabindex="0"
        class="preset-card sdmx-focus-ring"
        :class="{ 'preset-card--active': selectedPresetId === preset.id }"
        :data-sdmx-info="info('program.presets.editPreset')"
        @click="selectPreset(preset.id)"
        @dblclick="onPresetActivate(preset)"
        @keydown.enter.prevent="onPresetActivate(preset)"
        @keydown.space.prevent="selectPreset(preset.id)"
      >
        <div class="preset-card__top">
          <div class="preset-card__title-row">
            <span
              class="preset-card__swatch"
              :style="{ background: preset.color || 'var(--sdmx-color-primary)' }"
            />
            <div class="preset-card__title">{{ preset.name }}</div>
          </div>
          <SdmxStatusChip
            :label="targetSummary(preset)"
            variant="info"
          />
        </div>
        <div
          class="preset-card__actions"
          @click.stop
          @dblclick.stop
        >
          <XButton
            flat
            size="sm"
            icon="player-play-filled"
            :data-sdmx-info="info('desk.presets.fire', { name: preset.name })"
            @click="firePreset(preset.id)"
          />
          <XButton
            v-info="'program.presets.editPreset'"
            flat
            size="sm"
            icon="pencil"
            @click="openEditor(preset.id)"
          />
        </div>
      </div>
    </div>

    <SdmxEmptyState
      v-else
      icon="palette"
      title="No presets yet"
      hint="Create presets in the editor, or store them from the Live programmer bar. Double-click a preset to edit it."
    >
      <SdmxButton
        variant="primary"
        icon="pencil"
        label="Edit presets"
        info="program.presets.editPreset"
        @click="openEditor()"
      />
    </SdmxEmptyState>

    <q-dialog
      v-model="showPresetEditor"
      maximized
      transition-show="fade"
      transition-hide="fade"
      class="preset-editor-dialog-host"
    >
      <div class="preset-editor-dialog-shell">
        <PresetEditor
          :initial-preset-id="editorPresetId"
          @close="closeEditor"
        />
      </div>
    </q-dialog>
  </div>
</template>

<style scoped>
.preset-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: var(--sdmx-space-md);
  gap: var(--sdmx-space-md);
  overflow: hidden;
}

.preset-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sdmx-space-md);
  flex-wrap: wrap;
  flex-shrink: 0;
}

.preset-panel__actions {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
}

.preset-panel__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--sdmx-space-sm);
  align-content: start;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-bottom: var(--sdmx-space-sm);
}

.preset-card {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-sm);
  min-width: 0;
  min-height: var(--sdmx-space-touch);
  padding: var(--sdmx-space-md);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-md);
  background: var(--sdmx-color-bg-elevated);
  color: var(--sdmx-color-text);
  text-align: left;
  cursor: pointer;
}

.preset-card:hover {
  background: var(--sdmx-color-hover);
  border-color: var(--sdmx-color-border);
}

.preset-card--active {
  border-color: var(--sdmx-color-primary);
  background: var(--sdmx-color-primary-soft);
}

/* Active selection already signals focus; don't stack a second outline after dialog close. */
.preset-card--active:focus-visible {
  outline: none;
}

.preset-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sdmx-space-sm);
}

.preset-card__title-row {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
  min-width: 0;
  flex: 1 1 auto;
}

.preset-card__swatch {
  width: 12px;
  height: 12px;
  border-radius: var(--sdmx-radius-sm);
  border: 1px solid var(--sdmx-color-border-subtle);
  flex-shrink: 0;
}

.preset-card__title {
  font-weight: var(--sdmx-font-weight-bold);
  font-size: var(--sdmx-font-size-label);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.preset-card__actions {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-xs);
  margin-top: auto;
}

.preset-editor-dialog-shell {
  width: 100%;
  height: 100%;
  max-width: 100vw;
  max-height: 100vh;
  overflow: hidden;
  background: var(--sdmx-color-bg-page);
}
</style>
