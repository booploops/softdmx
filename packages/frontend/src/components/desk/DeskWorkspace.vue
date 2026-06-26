<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { DESK_GRID_COLS, type DeskPane } from '@softdmx/engine';
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

  // Full-width panes become global rows at the bottom (e.g. playback rail).
  const fullWidthPanes = panes.value
    .filter((pane) => pane.rect.w >= DESK_GRID_COLS)
    .sort((a, b) => a.rect.y - b.rect.y);
  // Other panes use grid-neighbor placement so rows and columns line up.
  const regularPanes = panes.value.filter((pane) => pane.rect.w < DESK_GRID_COLS);
  const sortedRegularPanes = [...regularPanes].sort(
    (a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x
  );
  const rowStartByY = new Map<number, number>();
  sortedRegularPanes.forEach((pane) => {
    const current = rowStartByY.get(pane.rect.y);
    if (current === undefined || pane.rect.x < current) {
      rowStartByY.set(pane.rect.y, pane.rect.x);
    }
  });
  const panelIdCounts = new Map<string, number>();
  const makePanelId = (baseId: string): string => {
    const existing = panelIdCounts.get(baseId) ?? 0;
    panelIdCounts.set(baseId, existing + 1);
    return existing === 0 ? baseId : `${baseId}-${existing + 1}`;
  };
  const panelIdsByPane = new Map<DeskPane, string>();

  let hasPanels = false;
  let lastRegularPanelId: string | undefined;

  sortedRegularPanes.forEach((pane) => {
    const panelId = makePanelId(pane.id);
    const title = paneMeta(pane)?.label ?? pane.windowType;

    const leftNeighbor = sortedRegularPanes
      .filter(
        (candidate) =>
          candidate !== pane &&
          candidate.rect.y === pane.rect.y &&
          candidate.rect.x < pane.rect.x &&
          panelIdsByPane.has(candidate)
      )
      .sort((a, b) => b.rect.x - a.rect.x)[0];

    const aboveNeighbor = sortedRegularPanes
      .filter(
        (candidate) =>
          candidate !== pane &&
          candidate.rect.y < pane.rect.y &&
          panelIdsByPane.has(candidate) &&
          candidate.rect.x < pane.rect.x + pane.rect.w &&
          pane.rect.x < candidate.rect.x + candidate.rect.w
      )
      .sort((a, b) => b.rect.y - a.rect.y || b.rect.x - a.rect.x)[0];

    const isRowStart = pane.rect.x === rowStartByY.get(pane.rect.y);

    if (!hasPanels) {
      api.addPanel({
        id: panelId,
        component: 'default',
        title: title,
        params: { pane: toRaw(pane) },
      });
      hasPanels = true;
    } else if (isRowStart) {
      // First pane in a new row should split the whole layout below,
      // not just a single column panel.
      api.addPanel({
        id: panelId,
        component: 'default',
        title: title,
        position: { direction: 'below' },
        params: { pane: toRaw(pane) },
      });
    } else if (leftNeighbor) {
      api.addPanel({
        id: panelId,
        component: 'default',
        title: title,
        position: { direction: 'right', referencePanel: panelIdsByPane.get(leftNeighbor)! },
        params: { pane: toRaw(pane) },
      });
    } else if (aboveNeighbor) {
      api.addPanel({
        id: panelId,
        component: 'default',
        title: title,
        position: { direction: 'below', referencePanel: panelIdsByPane.get(aboveNeighbor)! },
        params: { pane: toRaw(pane) },
      });
    } else {
      api.addPanel({
        id: panelId,
        component: 'default',
        title: title,
        position: lastRegularPanelId
          ? { direction: 'right', referencePanel: lastRegularPanelId }
          : { direction: 'right' },
        params: { pane: toRaw(pane) },
      });
    }

    panelIdsByPane.set(pane, panelId);
    lastRegularPanelId = panelId;
  });

  let previousFullWidthPanelId: string | undefined;
  fullWidthPanes.forEach((pane) => {
    const panelId = makePanelId(pane.id);
    const title = paneMeta(pane)?.label ?? pane.windowType;

    if (!hasPanels) {
      api.addPanel({
        id: panelId,
        component: 'default',
        title: title,
        params: { pane: toRaw(pane) },
      });
      hasPanels = true;
      previousFullWidthPanelId = panelId;
      return;
    }

    api.addPanel({
      id: panelId,
      component: 'default',
      title: title,
      position: previousFullWidthPanelId
        ? { direction: 'below', referencePanel: previousFullWidthPanelId }
        : { direction: 'below' },
      params: { pane: toRaw(pane) },
    });
    previousFullWidthPanelId = panelId;
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
