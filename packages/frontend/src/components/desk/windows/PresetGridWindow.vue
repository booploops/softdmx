<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useShowStore } from 'src/stores/show';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { SdmxButton, SdmxEmptyState, SdmxValueField } from 'src/components/ui';
import { useInfoText } from 'src/composables/useInfoText';

const showStore = useShowStore();
const engine = useOutputEngineStore();
const { info } = useInfoText();

const presets = computed(() => showStore.document.presets);
const presetFadeMs = ref(500);

function firePreset(presetId: string) {
  engine.firePreset(presetId, Math.max(0, presetFadeMs.value));
}
</script>

<template>
  <div class="preset-grid-window">
    <div class="preset-grid-window__toolbar">
      <span class="sdmx-text-label">Presets</span>
      <SdmxValueField label="Fade" :value="presetFadeMs" unit="ms" size="sm" />
      <q-input
        v-info="'desk.presets.fadeMs'"
        v-model.number="presetFadeMs"
        type="number"
        dense
        outlined
        label="Fade ms"
        class="preset-fade-input sdmx-focus-ring"
        style="width: 110px"
      />
    </div>
    <div v-if="presets.length" class="preset-fire-grid">
      <SdmxButton
        v-for="preset in presets"
        :key="preset.id"
        class="preset-fire-btn"
        :label="preset.name"
        size="lg"
        variant="default"
        :info="info('desk.presets.fire', { name: preset.name })"
        :style="preset.color ? { backgroundColor: preset.color, color: 'var(--sdmx-color-text)' } : {}"
        @click="firePreset(preset.id)"
      />
    </div>
    <SdmxEmptyState
      v-else
      icon="palette"
      title="No presets"
      hint="Create presets in Program → Presets to fire them from this grid."
    />
  </div>
</template>

<style scoped>
.preset-grid-window {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.preset-grid-window__toolbar {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  flex-shrink: 0;
}

.preset-fire-grid {
  flex: 1 1 auto;
  overflow: auto;
}

.preset-fire-btn {
  min-height: 48px;
  width: 100%;
}
</style>
