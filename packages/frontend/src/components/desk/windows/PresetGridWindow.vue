<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { SdmxButton, SdmxEmptyState } from 'src/components/ui';
import { useInfoText } from 'src/composables/useInfoText';
import { presetButtonStyle } from 'src/lib/preset-button-style';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useShowStore } from 'src/stores/show';
import { computed, ref } from 'vue';

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
      <XInput
        v-info="'desk.presets.fadeMs'"
        v-model.number="presetFadeMs"
        type="number"
        min="0"
        dense
        label="Fade (ms)"
        class="preset-grid-window__fade"
      />
    </div>
    <div
      v-if="presets.length"
      class="preset-fire-grid"
    >
      <SdmxButton
        v-for="preset in presets"
        :key="preset.id"
        class="preset-fire-btn"
        :label="preset.name"
        size="lg"
        variant="default"
        :info="info('desk.presets.fire', { name: preset.name })"
        :style="presetButtonStyle(preset.color)"
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
  min-height: 0;
  overflow: hidden;
}

.preset-grid-window__toolbar {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  flex-shrink: 0;
}

.preset-grid-window__fade {
  width: 120px;
  margin-left: auto;
}

.preset-fire-grid {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--sdmx-space-sm);
  align-content: start;
  padding: var(--sdmx-space-sm);
}

.preset-fire-btn {
  min-height: var(--sdmx-space-touch);
  width: 100%;
}
</style>
