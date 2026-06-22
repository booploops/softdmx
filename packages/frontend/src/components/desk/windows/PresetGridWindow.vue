<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useShowStore } from 'src/stores/show';
import { useOutputEngineStore } from 'src/stores/output-playback';

const showStore = useShowStore();
const engine = useOutputEngineStore();

const presets = computed(() => showStore.document.presets);
const presetFadeMs = ref(500);

function firePreset(presetId: string) {
  engine.firePreset(presetId, Math.max(0, presetFadeMs.value));
}
</script>

<template>
  <div class="preset-grid-window">
    <div class="row items-center q-px-sm q-py-xs q-gutter-sm">
      <span class="text-caption text-weight-bold">Presets</span>
      <q-input v-model.number="presetFadeMs" type="number" dense outlined label="Fade ms" style="width: 110px" />
    </div>
    <div v-if="presets.length" class="preset-fire-grid">
      <q-btn
        v-for="preset in presets"
        :key="preset.id"
        class="preset-fire-btn"
        unelevated
        no-caps
        :style="preset.color ? { backgroundColor: preset.color, color: 'var(--sdmx-color-text)' } : {}"
        @click="firePreset(preset.id)"
      >
        {{ preset.name }}
      </q-btn>
    </div>
    <div v-else class="q-pa-lg text-center text-grey-5">No presets in show</div>
  </div>
</template>

<style scoped>
.preset-grid-window {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.preset-fire-grid {
  flex: 1 1 auto;
  overflow: auto;
}
</style>
