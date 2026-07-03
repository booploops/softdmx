<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { ref, watch, onUnmounted, type Component } from 'vue';
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
const containerRef = ref<HTMLElement | null>(null);

const components: Record<string, Component> = {
  WSPanelContent: WSWorkspacePanel,
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
    {
      label: params.panel.api.isMaximized() ? 'Exit Maximize' : 'Maximize',
      action: () => {
        if (params.panel.api.isMaximized()) {
          params.panel.api.exitMaximized();
        } else {
          params.panel.api.maximize();
        }
      },
    },
    {
      label: 'Float',
      action: () => {
        params.api.addFloatingGroup(params.panel);
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

function updateFloatingWindowTitlebars() {
  if (!innerApi || !containerRef.value) return;
  const titlebars = containerRef.value.querySelectorAll('.dv-floating-titlebar');
  titlebars.forEach((titlebarEl) => {
    const titlebar = titlebarEl as HTMLElement;
    const floatingEl = titlebar.parentElement;
    if (!floatingEl) return;

    let customTitlebar = titlebar.querySelector('.sdmx-windows-titlebar-content');
    if (!customTitlebar) {
      titlebar.innerHTML = '';
      
      customTitlebar = document.createElement('div');
      customTitlebar.className = 'sdmx-windows-titlebar-content';
      
      const titleText = document.createElement('div');
      titleText.className = 'sdmx-windows-titlebar-title';
      customTitlebar.appendChild(titleText);
      
      const controls = document.createElement('div');
      controls.className = 'sdmx-windows-titlebar-controls';
      
      const maxBtn = document.createElement('button');
      maxBtn.className = 'sdmx-titlebar-btn sdmx-titlebar-max';
      maxBtn.innerHTML = '<span class="sdmx-max-icon"></span>';
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'sdmx-titlebar-btn sdmx-titlebar-close';
      closeBtn.innerHTML = '<span class="sdmx-close-icon">&times;</span>';
      
      controls.appendChild(maxBtn);
      controls.appendChild(closeBtn);
      customTitlebar.appendChild(controls);
      titlebar.appendChild(customTitlebar);
    }

    const group = innerApi.groups.find((g) => floatingEl.contains(g.element));
    if (group && group.activePanel) {
      const activePanel = group.activePanel;
      
      const titleTextEl = customTitlebar.querySelector('.sdmx-windows-titlebar-title');
      if (titleTextEl) {
        const newTitle = activePanel.title || '';
        if (titleTextEl.textContent !== newTitle) {
          titleTextEl.textContent = newTitle;
        }
      }
      
      const stopAll = (e: Event) => {
        e.stopPropagation();
      };

      const maxBtn = customTitlebar.querySelector('.sdmx-titlebar-max') as HTMLButtonElement;
      if (maxBtn) {
        const isMax = activePanel.api.isMaximized();
        maxBtn.setAttribute('title', isMax ? 'Restore Down' : 'Maximize');
        if (isMax) {
          maxBtn.classList.add('is-maximized');
        } else {
          maxBtn.classList.remove('is-maximized');
        }
        
        maxBtn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (activePanel.api.isMaximized()) {
            activePanel.api.exitMaximized();
          } else {
            activePanel.api.maximize();
          }
        };
        maxBtn.onmousedown = stopAll;
        maxBtn.onpointerdown = stopAll;
        maxBtn.ontouchstart = stopAll;
      }
      
      const closeBtn = customTitlebar.querySelector('.sdmx-titlebar-close') as HTMLButtonElement;
      if (closeBtn) {
        closeBtn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          activePanel.api.close();
        };
        closeBtn.onmousedown = stopAll;
        closeBtn.onpointerdown = stopAll;
        closeBtn.ontouchstart = stopAll;
      }
    }
  });
}

function onReady(event: DockviewReadyEvent) {
  innerApi = event.api;

  const activeDisposable = innerApi.onDidActivePanelChange(() => {
    workspaceStore.setActiveWorkspace(workspaceId);
  });
  disposables.push(() => activeDisposable.dispose());

  // Restore using hydrated data. We wait for ensureHydrated() so that
  // dynamically created workspace instances (from outer layout restore or
  // user actions) see the correct persisted inner layout from the client.
  const attachLayoutListener = () => {
    const layoutDisposable = innerApi!.onDidLayoutChange(() => {
      if (!innerApi) return;
      try {
        const json = innerApi.toJSON();
        workspaceStore.saveWorkspaceLayout(workspaceId, json);
      } catch (err) {
        console.error(`Failed to serialize workspace layout for ${workspaceId}:`, err);
      }
    });
    disposables.push(() => layoutDisposable.dispose());
  };

  const restore = () => {
    const savedLayout = workspaceStore.getWorkspaceLayout(workspaceId);
    if (savedLayout) {
      try {
        workspaceStore.withRestore(() => {
          innerApi!.fromJSON(savedLayout);
        });
      } catch (err) {
        console.error(`Failed to restore workspace layout for ${workspaceId}:`, err);
      }
    }
    attachLayoutListener();

    try {
      workspaceStore.saveWorkspaceLayout(workspaceId, innerApi!.toJSON());
    } catch (err) {
      console.error(`Failed to serialize initial workspace layout for ${workspaceId}:`, err);
    }
  };

  if (workspaceStore.hydrated) {
    restore();
  } else {
    workspaceStore.ensureHydrated().then(restore);
  }

  const observer = new MutationObserver(() => {
    updateFloatingWindowTitlebars();
  });
  if (containerRef.value) {
    observer.observe(containerRef.value, { childList: true, subtree: true });
  }
  disposables.push(() => observer.disconnect());
  updateFloatingWindowTitlebars();
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
    ref="containerRef"
    class="ws-workspace-instance"
    @pointerdown="workspaceStore.setActiveWorkspace(workspaceId)"
  >
    <DockviewVue
      class="dockview-theme-dark sdmx-dockview-inner"
      :components="components"
      :getTabContextMenuItems="getTabContextMenuItems"
      :floatingGroupDragHandle="'titlebar'"
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
