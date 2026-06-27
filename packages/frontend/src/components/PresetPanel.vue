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
  <div class="preset-panel q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6">Presets</div>
      <q-space />
      <q-input
        v-model.number="presetFadeMs"
        type="number"
        min="0"
        dense
        label="Fade (ms)"
        style="max-width: 130px"
      />
      <q-btn v-info="'program.presets.editPreset'" dense flat icon="edit" label="Edit Presets" class="q-ml-sm" @click="showPresetEditor = true" />
    </div>
    <div class="row q-gutter-sm q-mb-lg">
      <q-btn
        v-for="preset in presets"
        :key="preset.id"
        :label="preset.name"
        :style="preset.color ? { backgroundColor: preset.color, color: 'var(--sdmx-color-text)' } : {}"
        @click="firePreset(preset.id)"
      />
      <span v-if="presets.length === 0" class="text-grey-5">No presets — use Live bar to save one</span>
    </div>

    <q-dialog v-model="showPresetEditor" maximized>
      <q-card><PresetEditor /></q-card>
    </q-dialog>
  </div>
</template>
