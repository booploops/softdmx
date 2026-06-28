<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { DockviewVue, type DockviewApi, type DockviewReadyEvent, type IDockviewPanelProps, type GetTabContextMenuItemsParams, type ContextMenuItem } from 'dockview-vue';
import { useQuasar } from 'quasar';
import WSWorkspacePanel from './WSWorkspacePanel.vue';
import { useWorkspaceStore } from 'src/stores/workspace';

const props = defineProps<{
  params: IDockviewPanelProps<{ workspaceId: string }>;
}>();

const $q = useQuasar();
const workspaceStore = useWorkspaceStore();
const workspaceId = props.params.params?.workspaceId || props.params.api.id;

const components = {
  WSPanelContent: WSWorkspacePanel as any,
};

function getTabContextMenuItems(params: GetTabContextMenuItemsParams): ContextMenuItem[] {
  return [
    {
      label: 'Rename',
      action: () => {
        $q.dialog({
          title: 'Rename Panel',
          message: 'Enter a new name for this panel:',
          prompt: {
            model: params.panel.title || '',
            type: 'text',
          },
          cancel: true,
          persistent: true,
          dark: true,
        }).onOk((newName: string) => {
          if (newName && newName.trim()) {
            params.panel.api.setTitle(newName.trim());
          }
        });
      },
    },
    'separator',
    'close',
    'closeOthers',
    'closeAll',
  ];
}

let innerApi: DockviewApi | undefined;
const disposables: (() => void)[] = [];

function onReady(event: DockviewReadyEvent) {
  innerApi = event.api;

  // Restore inner layout if persistent state exists
  const savedLayout = workspaceStore.getWorkspaceLayout(workspaceId);
  if (savedLayout) {
    try {
      innerApi.fromJSON(savedLayout);
    } catch (err) {
      console.error(`Failed to restore workspace layout for ${workspaceId}:`, err);
    }
  }

  // Subscribe to inner layout changes to serialize and persist
  const layoutDisposable = innerApi.onDidLayoutChange(() => {
    if (!innerApi) return;
    try {
      const json = innerApi.toJSON();
      workspaceStore.saveWorkspaceLayout(workspaceId, json);
    } catch (err) {
      console.error(`Failed to serialize workspace layout for ${workspaceId}:`, err);
    }
  });
  disposables.push(() => layoutDisposable.dispose());

  // Mark this workspace as active when an inner panel is focused/activated
  const activeDisposable = innerApi.onDidActivePanelChange(() => {
    workspaceStore.setActiveWorkspace(workspaceId);
  });
  disposables.push(() => activeDisposable.dispose());
}

// Watch for spawn requests targetting this specific workspace
const stopWatchSpawn = watch(
  () => workspaceStore.spawnRequest,
  (req) => {
    if (!req || req.workspaceId !== workspaceId) return;
    if (!innerApi) return;

    const id = `panel-${req.path.replace(/^\//, '')}-${Date.now()}`;
    innerApi.addPanel({
      id,
      component: 'WSPanelContent',
      title: req.title,
      params: {
        path: req.path,
      },
    });
  }
);

onUnmounted(() => {
  disposables.forEach((dispose) => dispose());
  stopWatchSpawn();
});
</script>

<template>
  <div
    class="ws-workspace-instance"
    @pointerdown="workspaceStore.setActiveWorkspace(workspaceId)"
  >
    <DockviewVue
      class="dockview-theme-dark sdmx-dockview-inner"
      :components="components"
      :getTabContextMenuItems="getTabContextMenuItems"
      @ready="onReady"
    />
  </div>
</template>

<style scoped lang="scss">
.ws-workspace-instance {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sdmx-dockview-inner {
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
