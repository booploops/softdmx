<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { ref } from 'vue';
import XSidebarButton from 'src/components/controls/XSidebarButton.vue';
import WSWorkspacePanel from 'src/components/workspace/WSWorkspacePanel.vue';
import { WorkspacePanels } from 'src/lib/workspace-panels';
import type { Route } from '@booploops/pod-router';
import { DockviewVue, type DockviewApi, type DockviewReadyEvent } from 'dockview-vue';
import 'dockview-core/dist/styles/dockview.css';

const components = {
  WSPanelContent: WSWorkspacePanel as any,
};

let dockviewApi: DockviewApi | undefined;
const panelCounter = ref(1);

function formatPath(path: string) {
  return path.charAt(0).toUpperCase() + path.slice(1);
}

function spawnPanel(route: Route) {
  if (!dockviewApi) return;
  const id = `panel-${route.path}-${panelCounter.value++}`;
  const title = route.name || route.meta?.title || formatPath(route.path);
  
  const panelPath = route.path.startsWith('/') ? route.path : `/${route.path}`;
  
  dockviewApi.addPanel({
    id,
    component: 'WSPanelContent',
    title,
    params: {
      path: panelPath,
    },
  });
}

function onReady(event: DockviewReadyEvent) {
  dockviewApi = event.api;
  // Spawn initial panel
  if (WorkspacePanels.length > 0) {
    spawnPanel(WorkspacePanels[0]);
  }
}
</script>

<template>
  <div class="workspace-shell">
    <div class="workspace-sidebar">
      <XSidebarButton tooltip="Spawn Panel">
        <i class="codicon codicon-plus" />
        <q-menu anchor="bottom right" self="top left" class="sdmx-menu">
          <q-list style="min-width: 150px">
            <q-item
              v-for="panel in WorkspacePanels"
              :key="panel.path"
              clickable
              v-close-popup
              @click="spawnPanel(panel)"
            >
              <q-item-section>
                {{ panel.name || panel.meta?.title || formatPath(panel.path) }}
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </XSidebarButton>
      <XSidebarButton>
        <i class="codicon codicon-menu" />
      </XSidebarButton>
      <XSidebarButton>
        <i class="codicon codicon-gear" />
      </XSidebarButton>
    </div>
    <div class="workspace-viewport">
      <DockviewVue
        class="dockview-theme-dark sdmx-dockview"
        :components="components"
        @ready="onReady"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.workspace-shell {
  height: 100%;
  overflow: hidden;
  display: flex;
}

.workspace-sidebar {
  background: var(--sdmx-color-bg-drawer);
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1px solid var(--sdmx-color-border-subtle);
}

.workspace-viewport {
  container-type: inline-size;
  container-name: viewport;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--sdmx-color-bg-surface);
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