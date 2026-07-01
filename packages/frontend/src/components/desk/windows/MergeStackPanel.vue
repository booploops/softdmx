<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useOutputPlaybackStore } from 'src/stores/output-playback';
import { SdmxEmptyState } from 'src/components/ui';

const output = useOutputPlaybackStore();

const stack = computed(() => output.getMergeStackSnapshot());
</script>

<template>
  <div class="merge-stack-panel q-pa-sm">
    <SdmxEmptyState
      v-if="!stack || stack.layers.length === 0"
      icon="layers"
      title="No merge layers"
      hint="Playback and scratch activity will appear here."
    />
    <template v-else>
      <div class="merge-stack-panel__summary text-caption q-mb-sm">
        {{ stack.layers.length }} layers · {{ stack.mergedChannelCount }} merged channels ·
        {{ stack.conflicts.length }} conflicts
      </div>
      <div class="merge-stack-panel__stack">
        <div
          v-for="(layer, index) in stack.layers"
          :key="`${layer.source}-${layer.label}-${index}`"
          class="merge-stack-panel__layer"
        >
          <span
            v-if="layer.color"
            class="merge-stack-panel__color"
            :style="{ backgroundColor: layer.color }"
          />
          <div class="merge-stack-panel__meta">
            <div class="text-weight-bold">{{ layer.label }}</div>
            <div class="text-caption text-grey-5">
              {{ layer.source }} · priority {{ layer.priority }} · {{ layer.channelCount }} ch
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.merge-stack-panel {
  min-height: 0;
  overflow: auto;
}

.merge-stack-panel__stack {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
}

.merge-stack-panel__layer {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  background: var(--sdmx-color-bg-surface);
}

.merge-stack-panel__color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.merge-stack-panel__meta {
  min-width: 0;
}
</style>
