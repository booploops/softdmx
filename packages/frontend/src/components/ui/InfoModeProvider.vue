<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useUIStore } from 'src/stores/ui';

const ui = useUIStore();
const tooltip = ref<{ text: string; x: number; y: number } | null>(null);

function onMouseOver(event: MouseEvent) {
  if (!ui.infoMode) return;
  const target = (event.target as HTMLElement | null)?.closest('[data-sdmx-info]') as HTMLElement | null;
  if (!target) {
    tooltip.value = null;
    return;
  }
  const text = target.dataset.sdmxInfo;
  if (!text) return;
  tooltip.value = { text, x: event.clientX + 12, y: event.clientY + 12 };
}

function onMouseOut(event: MouseEvent) {
  const related = event.relatedTarget as HTMLElement | null;
  if (related?.closest('[data-sdmx-info]')) return;
  tooltip.value = null;
}
</script>

<template>
  <div
    :class="{ 'sdmx-info-mode': ui.infoMode }"
    @mouseover="onMouseOver"
    @mouseout="onMouseOut"
  >
    <slot />
    <div
      v-if="tooltip"
      class="sdmx-info-tooltip"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
    >
      {{ tooltip.text }}
    </div>
  </div>
</template>
