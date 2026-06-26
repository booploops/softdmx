<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { DeskPane } from '@softdmx/engine';
import { DESK_WINDOW_META } from 'src/desk/workspace-modes';
import DeskDockviewPanel from './DeskDockviewPanel.vue';
import { useDeskViewStore } from 'src/stores/desk-view';
import { useUIStore } from 'src/stores/ui';
import { useQuasar } from 'quasar';
import { DockviewVue, type DockviewApi, type DockviewReadyEvent } from 'dockview-vue';
import 'dockview-core/dist/styles/dockview.css';

const deskView = useDeskViewStore();
const ui = useUIStore();
const $q = useQuasar();

let dockviewApi: DockviewApi | undefined;

const components = {
  default: DeskDockviewPanel as any,
};

const panes = computed(() => deskView.activePanes);

function paneMeta(pane: DeskPane) {
  return DESK_WINDOW_META[pane.windowType];
}

function initializeLayout(api: DockviewApi) {
  api.clear();

  if (panes.value.length === 0) return;

  // Simple layout translation:
  // We'll group panels by row based on `rect.y`
  const rows = new Map<number, DeskPane[]>();
  for (const pane of panes.value) {
    const row = rows.get(pane.rect.y) || [];
    row.push(pane);
    rows.set(pane.rect.y, row);
  }

  // Sort rows by y
  const sortedY = Array.from(rows.keys()).sort((a, b) => a - b);

  let firstPanelIdInPrevRow: string | undefined;

  sortedY.forEach((y, rowIndex) => {
    const rowPanes = rows.get(y)!.sort((a, b) => a.rect.x - b.rect.x);
    let firstPanelIdInThisRow: string | undefined;

    rowPanes.forEach((pane, colIndex) => {
      const panelId = pane.id;

      const title = paneMeta(pane)?.label ?? pane.windowType;

      if (rowIndex === 0 && colIndex === 0) {
        // First ever panel
        api.addPanel({
          id: panelId,
          component: 'default',
          title: title,
          params: { pane: toRaw(pane) },
        });
        firstPanelIdInThisRow = panelId;
      } else if (colIndex === 0) {
        // First panel in a new row -> dock below the root layout to span full width
        api.addPanel({
          id: panelId,
          component: 'default',
          title: title,
          position: { direction: 'below' },
          params: { pane: toRaw(pane) },
        });
        firstPanelIdInThisRow = panelId;
      } else {
        // Subsequent panels in the same row -> dock to the right
        api.addPanel({
          id: panelId,
          component: 'default',
          title: title,
          position: { direction: 'right', referencePanel: rowPanes[colIndex - 1].id },
          params: { pane: toRaw(pane) },
        });
      }
    });

    firstPanelIdInPrevRow = firstPanelIdInThisRow;
  });
}

function onReady(event: DockviewReadyEvent) {
  dockviewApi = event.api;
  initializeLayout(event.api);
}

// Watch for view changes to re-initialize layout
watch(
  () => deskView.activeViewId,
  () => {
    if (dockviewApi) {
      initializeLayout(dockviewApi);
    }
  }
);
</script>

<template>
  <div class="desk-workspace-root">
    <DockviewVue
      class="dockview-theme-dark sdmx-dockview"
      :components="components"
      @ready="onReady"
    />
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

.sdmx-dockview {
  width: 100%;
  height: 100%;
  --dv-activegroup-visiblepanel-tab-background-color: var(--sdmx-color-bg-elevated);
  --dv-inactivegroup-visiblepanel-tab-background-color: var(--sdmx-color-bg-surface);
  --dv-group-view-background-color: var(--sdmx-color-bg-surface);
  --dv-tabs-and-actions-container-background-color: var(--sdmx-color-bg-subtle);
  --dv-activegroup-visiblepanel-tab-color: var(--sdmx-color-text);
  --dv-inactivegroup-visiblepanel-tab-color: var(--sdmx-color-text-muted);
  --dv-tab-divider-color: var(--sdmx-color-border-subtle);
  --dv-pane-divider-color: var(--sdmx-color-border-strong);
}
</style>
