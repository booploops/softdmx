/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type { NinjaKeys } from "ninja-keys";
import { useUIStore } from "src/stores/ui";
import { useThemeStore } from "src/stores/theme";
import { useWorkspaceStore } from "src/stores/workspace";
import { useShowStore } from "src/stores/show";
import { WorkspacePanels } from "src/lib/workspace/panels";

type NinjaKeysCommand = NinjaKeys["data"][number];

export const useCommandPaletteStore = defineStore("command-palette", () => {
  const customCommands = ref<NinjaKeysCommand[]>([]);
  let openCallback: (() => void) | null = null;

  function setOpenCallback(cb: (() => void) | null) {
    openCallback = cb;
  }

  function open() {
    if (openCallback) {
      openCallback();
    }
  }

  function add(command: NinjaKeysCommand) {
    customCommands.value.push(command);
  }

  function remove(command: NinjaKeysCommand) {
    const index = customCommands.value.indexOf(command);
    if (index >= 0) {
      customCommands.value.splice(index, 1);
    }
  }

  const staticCommands = computed<NinjaKeysCommand[]>(() => {
    const ui = useUIStore();
    const workspaceStore = useWorkspaceStore();
    const showStore = useShowStore();
    const themeStore = useThemeStore();

    return [
      // === Show File Operations ===
      {
        id: "undo",
        title: "Undo Last Action",
        hotkey: "ctrl+z",
        section: "Show",
        handler: () => {
          showStore.undo();
        },
      },
      {
        id: "redo",
        title: "Redo Action",
        hotkey: "ctrl+y",
        section: "Show",
        handler: () => {
          showStore.redo();
        },
      },
      {
        id: "new-show",
        title: "Create New Show",
        section: "Show",
        handler: () => {
          showStore.newShow();
        },
      },
      {
        id: "download-show",
        title: "Download Showfile",
        section: "Show",
        handler: () => {
          showStore.downloadShow();
        },
      },

      // === Navigation / Modes ===
      {
        id: "mode-live",
        title: "Switch to Live Mode",
        section: "Navigation",
        handler: () => {
          ui.setMode("live");
        },
      },
      {
        id: "mode-program",
        title: "Switch to Programmer Mode",
        section: "Navigation",
        handler: () => {
          ui.setMode("program");
        },
      },
      {
        id: "mode-timeline",
        title: "Switch to Timeline Mode",
        section: "Navigation",
        handler: () => {
          ui.setMode("timeline");
        },
      },
      {
        id: "mode-setup",
        title: "Switch to Setup Mode",
        section: "Navigation",
        handler: () => {
          ui.setMode("setup");
        },
      },

      // === Workspaces ===
      {
        id: "create-workspace",
        title: "Create New Workspace",
        section: "Workspace",
        handler: () => {
          workspaceStore.requestCreateWorkspace("New Workspace");
        },
      },
      {
        id: "spawn-panel",
        title: "Spawn Panel...",
        section: "Workspace",
      },

      // === Interface / Toggles ===
      {
        id: "toggle-operate-lock",
        title: "Toggle Operate Lock",
        section: "Interface",
        handler: () => {
          ui.toggleOperateLock();
        },
      },
      {
        id: "toggle-lock-icon",
        title: "Toggle Show Operate Lock Icon",
        section: "Interface",
        handler: () => {
          ui.toggleShowOperateLockIcon();
        },
      },
      {
        id: "toggle-left-drawer",
        title: "Toggle Sidebar Drawer",
        section: "Interface",
        handler: () => {
          ui.toggleLeftDrawer();
        },
      },
      {
        id: "toggle-info-mode",
        title: "Toggle Info Mode",
        section: "Interface",
        handler: () => {
          ui.toggleInfoMode();
        },
      },
      {
        id: "toggle-command-line",
        title: "Toggle Command Line Bar",
        section: "Interface",
        handler: () => {
          ui.toggleCommandLine();
        },
      },
      {
        id: "toggle-attribute-panel",
        title: "Toggle Attribute Panel",
        section: "Interface",
        handler: () => {
          ui.toggleAttributePanel();
        },
      },
      {
        id: "toggle-programmer-pane",
        title: "Toggle Programmer Pane (Collapse)",
        section: "Interface",
        handler: () => {
          ui.programmerCollapsed = !ui.programmerCollapsed;
        },
      },
      {
        id: "toggle-cue-bar-pane",
        title: "Toggle Cue Bar Pane (Collapse)",
        section: "Interface",
        handler: () => {
          ui.cueBarCollapsed = !ui.cueBarCollapsed;
        },
      },
      {
        id: "open-cue-editor",
        title: "Open Cue Editor Dialog",
        section: "Interface",
        handler: () => {
          ui.openDialog("cueEditor");
        },
      },

      // === Themes ===
      {
        id: "select-theme",
        title: "Select Theme...",
        section: "Theme",
      },
      {
        id: "reset-theme-overrides",
        title: "Reset Theme Overrides",
        section: "Theme",
        handler: () => {
          themeStore.resetOverrides();
        },
      },
      {
        id: "dockview-theme-dark",
        title: "Set Dockview Theme: Dark",
        section: "Theme",
        handler: () => {
          themeStore.setDockviewTheme("dark");
        },
      },
      {
        id: "dockview-theme-light",
        title: "Set Dockview Theme: Light",
        section: "Theme",
        handler: () => {
          themeStore.setDockviewTheme("light");
        },
      },
    ];
  });

  const panelCommands = computed<NinjaKeysCommand[]>(() => {
    const workspaceStore = useWorkspaceStore();
    return WorkspacePanels.filter((panel) => panel.showInSpawnMenu).map((panel) => ({
      id: `spawn-panel-${panel.path}`,
      title: panel.label,
      parent: "spawn-panel",
      handler: () => {
        const path = panel.path.startsWith("/") ? panel.path : `/${panel.path}`;
        workspaceStore.requestSpawnPanel(workspaceStore.activeWorkspaceId, path, panel.label);
      },
    }));
  });

  const themeCommands = computed<NinjaKeysCommand[]>(() => {
    const themeStore = useThemeStore();
    return themeStore.availableThemes.map((theme) => ({
      id: `theme-select-${theme.id}`,
      title: theme.name,
      parent: "select-theme",
      handler: () => {
        themeStore.setActiveThemeId(theme.id);
      },
    }));
  });

  const commands = computed<NinjaKeysCommand[]>(() => {
    return [
      ...staticCommands.value,
      ...panelCommands.value,
      ...themeCommands.value,
      ...customCommands.value,
    ];
  });

  return {
    commands,
    add,
    remove,
    setOpenCallback,
    open,
  };
});
