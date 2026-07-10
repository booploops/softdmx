<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useCueStore } from 'src/stores/cue';
import { useShowStore } from 'src/stores/show';
import { computed, ref } from 'vue';
import PresetEditor from './PresetEditor.vue';
import { presetButtonStyle } from 'src/lib/preset-button-style';

const showStore = useShowStore();
const cueStore = useCueStore();

const presets = computed(() => showStore.document.presets);
const showPresetEditor = ref(false);
const presetFadeMs = ref(1000);

function firePreset(presetId: string) {
  cueStore.firePreset(presetId, Math.max(0, presetFadeMs.value));
}
</script>

<template>
  <div class="preset-panel">
    <div class="preset-panel__header">
      <div class="text-h6">Presets</div>
      <div class="preset-panel__actions">
        <XInput
          v-model.number="presetFadeMs"
          type="number"
          min="0"
          label="Fade (ms)"
          style="max-width: 130px"
        />
        <XButton
          v-info="'program.presets.editPreset'"
          flat
          icon="pencil"
          label="Edit Presets"
          @click="showPresetEditor = true"
        />
      </div>
    </div>

    <div class="preset-panel__grid">
      <XButton
        v-for="preset in presets"
        :key="preset.id"
        :label="preset.name"
        :style="presetButtonStyle(preset.color)"
        @click="firePreset(preset.id)"
      />
      <span
        v-if="presets.length === 0"
        class="preset-panel__empty"
      >No presets — use Live bar to save one</span>
    </div>

    <XDialog
      v-model="showPresetEditor"
      maximized
    >
      <XDialogTitlebar
        title="Preset Editor"
        @close="showPresetEditor = false"
      />
      <XDialogBody class="preset-panel__editor-body">
        <PresetEditor />
      </XDialogBody>
    </XDialog>
  </div>
</template>

<style scoped>
.preset-panel {
  padding: var(--sdmx-space-md, 16px);
}

.preset-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.preset-panel__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preset-panel__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.preset-panel__empty {
  color: var(--sdmx-color-text-muted);
}

.preset-panel__editor-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
</style>
