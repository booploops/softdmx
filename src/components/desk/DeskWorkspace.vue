<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { DeskPane } from 'src/types/desk';
import { DESK_GRID_COLS, buildDeskRowBands, deskPaneGridPlacement } from 'src/utils/desk-defaults';
import { DESK_WINDOW_META } from 'src/desk/workspace-modes';
import DeskWindowHost from './DeskWindowHost.vue';
import { useDeskViewStore } from 'src/stores/desk-view';
import { useQuasar } from 'quasar';

const deskView = useDeskViewStore();
const $q = useQuasar();
const mobilePaneIndex = ref(0);

const isNarrow = computed(() => $q.screen.width < 900);

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
      <q-btn
        v-for="(pane, index) in panes"
        :key="pane.id"
        dense
        flat
        no-caps
        :color="mobilePaneIndex === index ? 'primary' : 'grey-6'"
        :label="DESK_WINDOW_META[pane.windowType]?.label ?? pane.windowType"
        @click="mobilePaneIndex = index"
      />
    </div>
    <div class="desk-pane-grid" :style="gridStyle">
      <div
        v-for="pane in visiblePanes"
        :key="pane.id"
        class="desk-window"
        :style="paneStyle(pane)"
      >
        <div class="desk-window-title">
          <q-icon :name="DESK_WINDOW_META[pane.windowType]?.icon ?? 'widgets'" size="16px" />
          {{ DESK_WINDOW_META[pane.windowType]?.label ?? pane.windowType }}
        </div>
        <div class="desk-window-body">
          <DeskWindowHost :pane="pane" />
        </div>
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
</style>
