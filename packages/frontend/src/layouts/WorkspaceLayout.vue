<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { ref } from 'vue';
import XSidebarButton from 'src/components/controls/XSidebarButton.vue';
import WSWorkspaceInstance from 'src/components/workspace/WSWorkspaceInstance.vue';
import MainMenu from 'src/components/workspace/MainMenu.vue';
import { WorkspacePanels } from 'src/lib/workspace-panels';
import type { Route } from '@booploops/pod-router';
import { DockviewVue, type DockviewApi, type DockviewReadyEvent, type GetTabContextMenuItemsParams, type ContextMenuItem } from 'dockview-vue';
import { useWorkspaceStore } from 'src/stores/workspace';
import { useQuasar } from 'quasar';
import 'dockview-core/dist/styles/dockview.css';

const $q = useQuasar();
const workspaceStore = useWorkspaceStore();
const components = {
    WorkspaceInstance: WSWorkspaceInstance as any,
};

function getTabContextMenuItems(params: GetTabContextMenuItemsParams): ContextMenuItem[] {
    return [
        {
            label: 'Rename',
            action: () => {
                $q.dialog({
                    title: 'Rename Workspace',
                    message: 'Enter a new name for this workspace:',
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

let outerApi: DockviewApi | undefined;
const workspaceCounter = ref(1);

function formatPath(path: string) {
    return path.charAt(0).toUpperCase() + path.slice(1);
}

function createNewWorkspace(focus = true): string {
    if (!outerApi) return '';
    const workspaceId = `workspace-${Date.now()}-${workspaceCounter.value++}`;
    const title = `Workspace ${workspaceCounter.value - 1}`;

    const panel = outerApi.addPanel({
        id: workspaceId,
        component: 'WorkspaceInstance',
        title,
        params: {
            workspaceId,
        },
    });

    if (panel && focus) {
        panel.api.setActive();
    }

    if (focus) {
        workspaceStore.setActiveWorkspace(workspaceId);
    }
    return workspaceId;
}

function spawnToolInActiveWorkspace(route: Route) {
    if (!outerApi) return;

    let targetWorkspaceId = workspaceStore.activeWorkspaceId;
    const panelPath = route.path.startsWith('/') ? route.path : `/${route.path}`;
    const title = route.name || route.meta?.title || formatPath(route.path);

    // Check if active workspace is still valid in outer layout
    if (!targetWorkspaceId || !outerApi.getPanel(targetWorkspaceId)) {
        targetWorkspaceId = createNewWorkspace(true);
    } else {
        // If it exists, make sure it is focused in the outer layout too
        const panel = outerApi.getPanel(targetWorkspaceId);
        if (panel) {
            panel.api.setActive();
        }
    }

    workspaceStore.requestSpawnPanel(targetWorkspaceId, panelPath, title);
}

function onReady(event: DockviewReadyEvent) {
    outerApi = event.api;

    // Restore outer layout if persistent state exists
    const savedOuterLayout = workspaceStore.outerLayout;
    if (savedOuterLayout) {
        try {
            outerApi.fromJSON(savedOuterLayout);
        } catch (err) {
            console.error('Failed to restore outer workspace layout:', err);
        }
    }

    // If no workspaces exist after layout restoration, create an initial one
    if (outerApi.panels.length === 0) {
        createNewWorkspace(true);
    }

    // Subscribe to outer layout changes to save to store
    outerApi.onDidLayoutChange(() => {
        if (!outerApi) return;
        try {
            workspaceStore.saveOuterLayout(outerApi.toJSON());
        } catch (err) {
            console.error('Failed to serialize outer workspace layout:', err);
        }
    });

    // Track focused workspace
    outerApi.onDidActivePanelChange((panelEvent) => {
        if (panelEvent && panelEvent.panel) {
            workspaceStore.setActiveWorkspace(panelEvent.panel.id);
        }
    });

    // Handle workspace panel removal to clean up its serialized inner layout
    outerApi.onDidRemovePanel((panel) => {
        workspaceStore.deleteWorkspaceLayout(panel.id);
        // Automatically spawn a new default workspace if all workspaces are closed
        if (outerApi && outerApi.panels.length === 0) {
            createNewWorkspace(true);
        }
    });
}
</script>

<template>
    <div class="workspace-shell">
        <div class="workspace-sidebar">
            <XSidebarButton tooltip="Spawn Panel">
                <i class="codicon codicon-plus"></i>
                <template #menu>
                    <q-menu
                        anchor="bottom right"
                        self="top left"
                        class="sdmx-menu"
                    >
                        <q-list style="min-width: 200px">
                            <!-- Workspaces Section -->
                            <div
                                class="q-px-md q-py-xs text-muted text-overline"
                                style="font-size: 0.65rem; letter-spacing: 0.1em; line-height: 1.5;"
                            >
                                Workspaces
                            </div>
                            <q-item
                                clickable
                                v-close-popup
                                @click="createNewWorkspace(true)"
                            >
                                <q-item-section class="q-py-xs">
                                    <div class="row items-center no-wrap">
                                        <i class="codicon codicon-plus q-mr-sm text-primary" />
                                        <span>New Workspace</span>
                                    </div>
                                </q-item-section>
                            </q-item>

                            <q-separator class="bg-border-subtle" />

                            <!-- Panels Section -->
                            <div
                                class="q-px-md q-py-xs text-muted text-overline"
                                style="font-size: 0.65rem; letter-spacing: 0.1em; line-height: 1.5;"
                            >
                                Spawn Panels
                            </div>
                            <q-item
                                v-for="panel in WorkspacePanels"
                                :key="panel.path"
                                clickable
                                v-close-popup
                                @click="spawnToolInActiveWorkspace(panel)"
                            >
                                <q-item-section class="q-py-xs">
                                    <div class="row items-center no-wrap">
                                        <i class="codicon codicon-terminal q-mr-sm" />
                                        <span>{{ panel.name || panel.meta?.title || formatPath(panel.path) }}</span>
                                    </div>
                                </q-item-section>
                            </q-item>
                        </q-list>
                    </q-menu>
                </template>
            </XSidebarButton>
            <XSidebarButton tooltip="Main Menu">
                <i class="codicon codicon-menu" />
                <template #menu>
                    <MainMenu touch-position />
                </template>
            </XSidebarButton>
            <XSidebarButton>
                <i class="codicon codicon-gear" />
            </XSidebarButton>
        </div>
        <div class="workspace-viewport">
            <DockviewVue
                class="dockview-theme-dark sdmx-dockview"
                :components="components"
                :getTabContextMenuItems="getTabContextMenuItems"
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