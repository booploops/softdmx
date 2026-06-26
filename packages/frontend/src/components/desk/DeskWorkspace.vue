<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { DeskPane } from '@softdmx/engine';
import { DESK_GRID_COLS, buildDeskRowBands, deskPaneGridPlacement } from '@softdmx/engine';
import { DESK_WINDOW_META } from 'src/desk/workspace-modes';
import DeskWindowHost from './DeskWindowHost.vue';
import DeskPaneResizeHandle from './DeskPaneResizeHandle.vue';
import { useDeskViewStore } from 'src/stores/desk-view';
import { useUIStore } from 'src/stores/ui';
import { SdmxWindowChrome } from 'src/components/ui';
import { useQuasar } from 'quasar';

const deskView = useDeskViewStore();
const ui = useUIStore();
const $q = useQuasar();
const mobilePaneIndex = ref(0);

const isNarrow = computed(() => $q.screen.width < 900);
const editLayout = computed(() => ui.isLive && !ui.operateLocked);

const panes = computed(() => deskView.activePanes);
const rowBands = computed(() => buildDeskRowBands(panes.value));

const gridStyle = computed(() => ({
  gridTemplateColumns: isNarrow.value ? '1fr' : `repeat(${DESK_GRID_COLS}, minmax(0, 1fr))`,
  gridTemplateRows: isNarrow.value
    ? '1fr'
    : rowBands.value.map((band) => `${Math.max(1, band.height)}fr`).join(' '),
}));

const visiblePanes = computed(() => {
  if (!isNarrow.value) return panes.value;
  const pane = panes.value[mobilePaneIndex.value];
  return pane ? [pane] : [];
});

function paneStyle(pane: DeskPane) {
  if (isNarrow.value) {
    return { gridColumn: '1 / -1', gridRow: '1 / -1' };
  }
  const placement = deskPaneGridPlacement(pane, rowBands.value);
  return {
    gridColumn: placement.column,
    gridRow: placement.row,
  };
}

function paneMeta(pane: DeskPane) {
  return DESK_WINDOW_META[pane.windowType];
}

watch(
  () => deskView.activeViewId,
  () => {
    mobilePaneIndex.value = 0;
  }
);
</script>

<template>
  <div class="desk-workspace-root">
    <div v-if="isNarrow && panes.length > 1" class="desk-pane-mobile-tabs">
      <button
        v-for="(pane, index) in panes"
        :key="pane.id"
        type="button"
        class="desk-pane-mobile-tab sdmx-focus-ring"
        :class="{ 'desk-pane-mobile-tab--active': mobilePaneIndex === index }"
        @click="mobilePaneIndex = index"
      >
        {{ paneMeta(pane)?.label ?? pane.windowType }}
      </button>
    </div>
    <div class="desk-pane-grid" :class="{ 'desk-pane-grid--edit': editLayout }" :style="gridStyle">
      <div
        v-for="pane in visiblePanes"
        :key="pane.id"
        class="desk-window"
        :class="{ 'desk-window--edit': editLayout }"
        :style="paneStyle(pane)"
      >
        <SdmxWindowChrome
          :title="paneMeta(pane)?.label ?? pane.windowType"
          :icon="paneMeta(pane)?.icon"
          :info="`Desk window: ${paneMeta(pane)?.label ?? pane.windowType}`"
        >
          <template v-if="editLayout" #actions>
            <DeskPaneResizeHandle :pane="pane" />
          </template>
          <DeskWindowHost :pane="pane" />
        </SdmxWindowChrome>
      </div>
    </div>
  </div>
</template>

<style scoped>
.desk-workspace-root {
  flex: var(--sdmx-desk-workspace-weight) 1 0;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.desk-pane-grid {
  flex: 1 1 0;
  min-height: 0;
}

.desk-pane-grid--edit {
  outline: 1px dashed var(--sdmx-color-border-strong);
  outline-offset: -1px;
}

.desk-window--edit {
  outline: 1px dashed var(--sdmx-color-info);
  outline-offset: -1px;
}

.desk-pane-mobile-tab {
  flex-shrink: 0;
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  border: none;
  border-radius: var(--sdmx-radius-sm);
  background: transparent;
  color: var(--sdmx-color-text-muted);
  font-size: var(--sdmx-font-size-label);
  cursor: pointer;
  min-height: var(--sdmx-space-touch);
}

.desk-pane-mobile-tab--active {
  background: var(--sdmx-color-primary-soft);
  color: var(--sdmx-color-primary);
}
</style>
