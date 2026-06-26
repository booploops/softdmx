<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { DeskPane } from '@softdmx/engine';
import { DESK_GRID_COLS } from '@softdmx/engine';
import { useDeskViewStore } from 'src/stores/desk-view';

const props = defineProps<{ pane: DeskPane }>();
const deskView = useDeskViewStore();

const RESIZE_STEP = 1;

function resizeWidth(delta: number) {
  const next = Math.max(1, Math.min(DESK_GRID_COLS - props.pane.rect.x, props.pane.rect.w + delta));
  deskView.updatePaneRect(props.pane.id, { w: next });
}

function resizeHeight(delta: number) {
  deskView.updatePaneRect(props.pane.id, { h: Math.max(1, props.pane.rect.h + delta) });
}
</script>

<template>
  <div class="desk-pane-resize">
    <button
      type="button"
      class="desk-pane-resize__btn sdmx-focus-ring"
      title="Narrower"
      aria-label="Narrow pane"
      @click="resizeWidth(-RESIZE_STEP)"
    >
      <q-icon name="chevron_left" size="14px" />
    </button>
    <button
      type="button"
      class="desk-pane-resize__btn sdmx-focus-ring"
      title="Wider"
      aria-label="Widen pane"
      @click="resizeWidth(RESIZE_STEP)"
    >
      <q-icon name="chevron_right" size="14px" />
    </button>
    <button
      type="button"
      class="desk-pane-resize__btn sdmx-focus-ring"
      title="Shorter"
      aria-label="Shorten pane"
      @click="resizeHeight(-RESIZE_STEP)"
    >
      <q-icon name="expand_less" size="14px" />
    </button>
    <button
      type="button"
      class="desk-pane-resize__btn sdmx-focus-ring"
      title="Taller"
      aria-label="Tall pane"
      @click="resizeHeight(RESIZE_STEP)"
    >
      <q-icon name="expand_more" size="14px" />
    </button>
  </div>
</template>

<style scoped>
.desk-pane-resize {
  display: flex;
  gap: 2px;
}

.desk-pane-resize__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: var(--sdmx-radius-sm);
  background: var(--sdmx-color-bg-muted);
  color: var(--sdmx-color-text-muted);
  cursor: pointer;
}

.desk-pane-resize__btn:hover {
  background: var(--sdmx-color-hover);
  color: var(--sdmx-color-text);
}
</style>
