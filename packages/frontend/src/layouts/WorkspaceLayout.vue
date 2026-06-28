<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { ref, computed, toRaw, watch, type Component } from 'vue';
import XSidebarButton from 'src/components/controls/XSidebarButton.vue';
import WSWorkspaceInstance from 'src/components/workspace/WSWorkspaceInstance.vue';
import { getPanelsMenu, type PanelMenuItem } from 'src/lib/workspace/panels';
import { getMainMenu, type MainMenuItem } from 'src/lib/main-menu';
import { WorkspaceLayouts, createWorkspaceWithPanels } from 'src/lib/workspace';
import type { Route } from '@booploops/pod-router';
import { DockviewVue, type DockviewApi, type DockviewReadyEvent, type GetTabContextMenuItemsParams, type ContextMenuItem } from 'dockview-vue';
import { useWorkspaceStore } from 'src/stores/workspace';
import { useQuasar } from 'quasar';
import { trpc } from 'src/lib/trpc';
import { createMenu } from 'src/lib/menus';
import 'dockview-core/dist/styles/dockview.css';
import { showSettingsUI } from 'src/lib/settings-ui';
import { useUIStore } from 'src/stores/ui';
import { SIDEBAR_SHORTCUTS } from 'src/lib/sidebar-shortcuts';

const $q = useQuasar();
const workspaceStore = useWorkspaceStore();
const ui = useUIStore();
const components: Record<string, Component> = {
    WorkspaceInstance: WSWorkspaceInstance,
};

const sidebarShortcuts = computed(() => {
    const enabled = new Set(Array.isArray(ui.sidebarShortcutIds) ? ui.sidebarShortcutIds : []);
    return SIDEBAR_SHORTCUTS.filter((shortcut) => enabled.has(shortcut.id));
});

const sidebarShortcutGroupClass = computed(() => ({
    'workspace-sidebar__shortcuts--dense': sidebarShortcuts.value.length >= 6,
    'workspace-sidebar__shortcuts--empty': sidebarShortcuts.value.length === 0,
}));

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
        {
            label: 'Export Workspace',
            action: async () => {
                const workspaceId = params.panel.id;
                const title = params.panel.title || 'Workspace';
                const savedLayout = workspaceStore.getWorkspaceLayout(workspaceId);

                if (!savedLayout) {
                    $q.dialog({
                        title: 'Export Failed',
                        message: 'No layout data found for this workspace.',
                        dark: true,
                    });
                    return;
                }

                const layout = JSON.parse(JSON.stringify(toRaw(savedLayout)));

                if (!isElectron.value) {
                    // Browser download fallback
                    try {
                        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ title, layout }, null, 2));
                        const downloadAnchor = document.createElement('a');
                        downloadAnchor.setAttribute('href', dataStr);
                        downloadAnchor.setAttribute('download', `${title}.json`);
                        document.body.appendChild(downloadAnchor);
                        downloadAnchor.click();
                        downloadAnchor.remove();
                    } catch (err: unknown) {
                        $q.dialog({
                            title: 'Export Failed',
                            message: err instanceof Error ? err.message : String(err),
                            dark: true,
                        });
                    }
                    return;
                }

                // Electron save
                try {
                    const res = await trpc.exportWorkspace.mutate({ title, layout });
                    if (res.success) {
                        // Successfully exported
                    } else if (res.error) {
                        $q.dialog({
                            title: 'Export Failed',
                            message: res.error,
                            dark: true,
                        });
                    }
                } catch (err: unknown) {
                    $q.dialog({
                        title: 'Export Failed',
                        message: err instanceof Error ? err.message : String(err),
                        dark: true,
                    });
                }
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

function spawnToolInActiveWorkspace(route: { path: string; label: string }) {
    if (!outerApi) return;

    let targetWorkspaceId = workspaceStore.activeWorkspaceId;
    const panelPath = route.path.startsWith('/') ? route.path : `/${route.path}`;
    const title = route.label || formatPath(route.path);

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

function openToolInNewWorkspace(route: { path: string; label: string }) {
    const panelPath = route.path.startsWith('/') ? route.path : `/${route.path}`;
    const title = route.label || formatPath(route.path);

    if (ui.sidebarShortcutNewWorkspacePolicy === 'reuse-existing' && outerApi) {
        const existing = outerApi.panels.find((panel) => panel.title === title);
        if (existing) {
            existing.api.setActive();
            workspaceStore.setActiveWorkspace(existing.id);
            return;
        }
    }

    createWorkspaceWithPanels(title, [panelPath]);
}

function handleSidebarShortcutClick(route: { path: string; label: string }) {
    if (ui.sidebarShortcutOpenMode === 'current-workspace') {
        spawnToolInActiveWorkspace(route);
        return;
    }

    openToolInNewWorkspace(route);
}

function mapPanelMenuItem(item: PanelMenuItem): FrontendMenuItem {
    const mapped: FrontendMenuItem = {
        label: item.label,
    };
    if (item.children && item.children.length > 0) {
        mapped.submenu = item.children.map(mapPanelMenuItem);
    } else {
        mapped.click = () => {
            spawnToolInActiveWorkspace({ path: item.path, label: item.label });
        };
    }
    return mapped;
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

watch(
    () => workspaceStore.createWorkspaceRequest,
    (req) => {
        if (!req || !outerApi) return;

        // Check if panel already exists to prevent duplicate addition
        const existingPanel = outerApi.getPanel(req.id);
        if (existingPanel) {
            existingPanel.api.setActive();
            workspaceStore.setActiveWorkspace(req.id);
            return;
        }

        const panel = outerApi.addPanel({
            id: req.id,
            component: 'WorkspaceInstance',
            title: req.name,
            params: {
                workspaceId: req.id,
            },
        });

        if (panel) {
            panel.api.setActive();
        }
        workspaceStore.setActiveWorkspace(req.id);
    }
);

const isElectron = computed(() => typeof window.electronTRPC !== 'undefined');

function importWorkspaceData(title: string, layout: unknown) {
    if (!outerApi) return;
    const workspaceId = `workspace-${Date.now()}-${workspaceCounter.value++}`;

    // Save the layout to store first
    workspaceStore.saveWorkspaceLayout(workspaceId, layout);

    const panel = outerApi.addPanel({
        id: workspaceId,
        component: 'WorkspaceInstance',
        title: title || `Workspace ${workspaceCounter.value - 1}`,
        params: {
            workspaceId,
        },
    });

    if (panel) {
        panel.api.setActive();
    }
    workspaceStore.setActiveWorkspace(workspaceId);
}

function handleImportedJSON(parsed: unknown) {
    let title = '';
    let layout = parsed;
    if (parsed && typeof parsed === 'object' && parsed !== null) {
        const parsedRecord = parsed as Record<string, unknown>;
        if ('layout' in parsedRecord) {
            layout = parsedRecord.layout;
            if (typeof parsedRecord.title === 'string') {
                title = parsedRecord.title;
            }
        }
        importWorkspaceData(title, layout);
    } else {
        throw new Error('Invalid workspace JSON structure');
    }
}

async function importWorkspaceJSON() {
    if (!isElectron.value) {
        // Browser file selection fallback
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const parsed = JSON.parse(text);
                handleImportedJSON(parsed);
            } catch (err: unknown) {
                $q.dialog({
                    title: 'Import Failed',
                    message: err instanceof Error ? err.message : String(err),
                    dark: true,
                });
            }
        };
        input.click();
        return;
    }

    // Electron file import via tRPC
    try {
        const res = await trpc.importWorkspace.mutate();
        if (res.success && res.data) {
            handleImportedJSON(res.data);
        } else if (res.error) {
            $q.dialog({
                title: 'Import Failed',
                message: res.error,
                dark: true,
            });
        }
    } catch (err: unknown) {
        $q.dialog({
            title: 'Import Failed',
            message: err instanceof Error ? err.message : String(err),
            dark: true,
        });
    }
}

function showNativeMainMenu() {
    const mapMenu = (items: MainMenuItem[]): FrontendMenuItem[] => {
        return items.map(item => {
            const mapped: FrontendMenuItem = {
                label: item.label,
                id: item.label,
            };
            if (item.click) {
                mapped.click = item.click;
            }
            if (item.children) {
                mapped.submenu = mapMenu(item.children);
            }
            return mapped;
        });
    };

    const template = mapMenu(getMainMenu({
        onImportWorkspace: importWorkspaceJSON,
    }));
    createMenu(template).show();
}

function showNativeSpawnMenu() {
    if (!isElectron.value) return;

    const template: FrontendMenuItem[] = [
        {
            label: 'New Workspace',
            click: () => {
                createNewWorkspace(true);
            }
        },
        {
            label: 'Layouts',
            submenu: WorkspaceLayouts.map((layoutPreset) => ({
                label: layoutPreset.title,
                click: () => {
                    importWorkspaceData(layoutPreset.title, layoutPreset.layout);
                }
            }))
        },
        {
            type: 'separator'
        },
        ...getPanelsMenu().map(mapPanelMenuItem)
    ];

    createMenu(template).show();
}
</script>

<template>
    <div class="workspace-shell">
        <div class="workspace-sidebar">
            <div class="workspace-sidebar__top">
                <XSidebarButton
                    tooltip="Main Menu"
                    @click="isElectron ? showNativeMainMenu() : undefined"
                >
                    <i class="codicon codicon-menu" />
                </XSidebarButton>
                <XSidebarButton
                    tooltip="Spawn Panel"
                    @click="isElectron ? showNativeSpawnMenu() : undefined"
                >
                    <i class="codicon codicon-plus"></i>
                </XSidebarButton>
                <XSidebarButton
                    v-if="ui.showOperateLockIcon"
                    :active="ui.operateLocked"
                    :tooltip="ui.operateLocked ? 'Operate Lock: On' : 'Operate Lock: Off'"
                    @click="ui.toggleOperateLock()"
                >
                    <i :class="ui.operateLocked ? 'codicon codicon-lock' : 'codicon codicon-unlock'" />
                </XSidebarButton>
                <div class="workspace-sidebar__shortcuts" :class="sidebarShortcutGroupClass">
                    <XSidebarButton
                        v-for="shortcut in sidebarShortcuts"
                        :key="shortcut.id"
                        :tooltip="shortcut.label"
                        @click="handleSidebarShortcutClick({ path: shortcut.path, label: shortcut.label })"
                    >
                        <i :class="`codicon codicon-${shortcut.icon}`" />
                    </XSidebarButton>
                </div>
            </div>

            <div class="workspace-sidebar__bottom">
                <XSidebarButton @click="showSettingsUI">
                    <i class="codicon codicon-gear" />
                </XSidebarButton>
            </div>
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

.workspace-sidebar__top {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.workspace-sidebar__shortcuts {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.workspace-sidebar__shortcuts--dense {
    gap: 0;
}

.workspace-sidebar__shortcuts--empty {
    display: none;
}

.workspace-sidebar__bottom {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
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
