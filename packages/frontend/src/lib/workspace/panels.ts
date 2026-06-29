/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Route } from "@booploops/pod-router";

export type WorkspaceRoute = Route & {
  label: string;
  parent?: string;
  showInSpawnMenu?: boolean;
};

export const WorkspacePanels: WorkspaceRoute[] = [
  {
    label: "Test Panel",
    path: "test",
    component: () => import("pages/TestPage.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Desk Shell",
    path: "desk-shell",
    component: () => import("components/desk/DeskShell.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Timeline Desk",
    path: "timeline-desk",
    component: () => import("components/desk/TimelineDesk.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Live Desk",
    path: "live-desk",
    component: () => import("components/desk/LiveDesk.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Setup Desk",
    path: "setup-desk",
    component: () => import("components/desk/SetupDesk.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Program Desk",
    path: "program-desk",
    component: () => import("components/desk/ProgramDesk.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Audio",
    path: "audio",
    component: () => import("components/AudioPanel.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Bindings",
    path: "bindings",
    component: () => import("components/BindingsPanel.vue"),
    showInSpawnMenu: false,
  },
  {
    label: "Bindings MIDI",
    path: "bindings-midi",
    component: () => import("components/BindingsMidiPanel.vue"),
    showInSpawnMenu: false,
  },
  {
    label: "Bindings OSC",
    path: "bindings-osc",
    component: () => import("components/BindingsOscPanel.vue"),
    showInSpawnMenu: false,
  },
  {
    label: "Effects",
    path: "effects",
    component: () => import("components/EffectsPanel.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Patch",
    path: "patch",
    component: () => import("components/PatchPanel.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Pixel Map",
    path: "pixel-map",
    component: () => import("components/PixelMapPanel.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Presets",
    path: "presets",
    component: () => import("components/PresetPanel.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Video Mapping",
    path: "video-mapping",
    component: () => import("components/VideoMappingPanel.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Visualizer",
    path: "visualizer",
    component: () => import("components/VisualizerPanel.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "3D Visualizer",
    path: "visualizer-3d",
    component: () => import("components/VisualizerPanel3D.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Programmer",
    path: "programmer-window",
    parent: "desk-shell",
    component: () => import("components/desk/windows/ProgrammerWindow.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Cue List",
    path: "cue-list",
    parent: "desk-shell",
    component: () => import("components/desk/CueListPanel.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Attribute Control",
    path: "attribute-control",
    parent: "desk-shell",
    component: () =>
      import("components/desk/windows/AttributeControlWindow.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Fixture Sheet",
    path: "fixture-sheet",
    parent: "desk-shell",
    component: () => import("components/desk/windows/FixtureSheetWindow.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Groups",
    path: "groups",
    parent: "desk-shell",
    component: () => import("components/desk/windows/GroupWindow.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Playback Rail",
    path: "playback-rail-window",
    parent: "desk-shell",
    component: () => import("components/desk/windows/PlaybackRailWindow.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "2D Plot",
    path: "plot-window",
    parent: "desk-shell",
    component: () => import("components/desk/windows/PlotWindow.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Preset Grid",
    path: "preset-grid",
    parent: "desk-shell",
    component: () => import("components/desk/windows/PresetGridWindow.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Quick Programmer",
    path: "quick-programmer",
    parent: "desk-shell",
    component: () =>
      import("components/desk/windows/QuickProgrammerWindow.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Widgets",
    path: "widgets-window",
    parent: "desk-shell",
    component: () => import("components/desk/windows/WidgetWindow.vue"),
    showInSpawnMenu: true,
  },
  {
    label: "Settings",
    path: "settings",
    component: () => import("components/SettingsPanel.vue"),
  },
  {
    label: "General",
    path: "settings-general",
    component: () => import("components/settings/SettingsGeneralSection.vue"),
  },
  {
    label: "Interface",
    path: "settings-interface",
    component: () => import("components/settings/SettingsInterfaceSection.vue"),
  },
  {
    label: "Output",
    path: "settings-output-sync",
    component: () => import("components/settings/SettingsOutputSection.vue"),
  },
  {
    label: "Sync",
    path: "settings-sync",
    component: () => import("components/settings/SettingsSyncSection.vue"),
  },
  {
    label: "Audio",
    path: "settings-audio",
    component: () => import("components/settings/SettingsAudioSection.vue"),
  },
  {
    label: "Plot",
    path: "settings-plot",
    component: () => import("components/settings/SettingsPlotSection.vue"),
  },
  {
    label: "Theme",
    path: "settings-theme",
    component: () => import("components/settings/SettingsThemeSection.vue"),
  },
  {
    label: "Sidebar",
    path: "settings-sidebar",
    component: () => import("components/settings/SettingsSidebarSection.vue"),
  },
];

export type PanelMenuItem = {
  label: string;
  path: string;
  children: PanelMenuItem[];
};

export function getPanelsMenu(): PanelMenuItem[] {
  // Create a menu based on WorkspacePanels, have submenus based on parent
  const menu: PanelMenuItem[] = [];
  const parentGroups = new Map<string, PanelMenuItem[]>();

  for (const panel of WorkspacePanels) {
    if (!panel.showInSpawnMenu) {
      continue;
    }
    if (panel.parent) {
      if (!parentGroups.has(panel.parent)) {
        parentGroups.set(panel.parent, []);
      }
      parentGroups.get(panel.parent)!.push({
        label: panel.label,
        path: panel.path,
        children: [],
      });
    } else {
      menu.push({
        label: panel.label,
        path: panel.path,
        children: [],
      });
    }
  }

  for (const [parent, items] of parentGroups.entries()) {
    menu.push({
      label: parent,
      path: "",
      children: items,
    });
  }

  return menu;
}
