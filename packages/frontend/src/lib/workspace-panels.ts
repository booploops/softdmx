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
};

export const WorkspacePanels: WorkspaceRoute[] = [
  {
    label: "Test Panel",
    path: "test",
    component: () => import("pages/TestPage.vue"),
  },
  {
    label: "Desk Shell",
    path: "desk-shell",
    component: () => import("components/desk/DeskShell.vue"),
  },
  {
    label: "Audio",
    path: "audio",
    component: () => import("components/AudioPanel.vue"),
  },
  {
    label: "Bindings",
    path: "bindings",
    component: () => import("components/BindingsPanel.vue"),
  },
  {
    label: "Effects",
    path: "effects",
    component: () => import("components/EffectsPanel.vue"),
  },
  {
    label: "Patch",
    path: "patch",
    component: () => import("components/PatchPanel.vue"),
  },
  {
    label: "Pixel Map",
    path: "pixel-map",
    component: () => import("components/PixelMapPanel.vue"),
  },
  {
    label: "Presets",
    path: "presets",
    component: () => import("components/PresetPanel.vue"),
  },
  {
    label: "Video Mapping",
    path: "video-mapping",
    component: () => import("components/VideoMappingPanel.vue"),
  },
  {
    label: "Visualizer",
    path: "visualizer",
    component: () => import("components/VisualizerPanel.vue"),
  },
  {
    label: "3D Visualizer",
    path: "visualizer-3d",
    component: () => import("components/VisualizerPanel3D.vue"),
  },
  {
    label: "Programmer",
    path: "programmer-window",
    parent: "desk-shell",
    component: () => import("components/desk/windows/ProgrammerWindow.vue"),
  },
  {
    label: "Cue List",
    path: "cue-list",
    parent: "desk-shell",
    component: () => import("components/desk/CueListPanel.vue"),
  },
  {
    label: "Attribute Control",
    path: "attribute-control",
    parent: "desk-shell",
    component: () => import("components/desk/windows/AttributeControlWindow.vue"),
  },
  {
    label: "Fixture Sheet",
    path: "fixture-sheet",
    parent: "desk-shell",
    component: () => import("components/desk/windows/FixtureSheetWindow.vue"),
  },
  {
    label: "Groups",
    path: "groups",
    parent: "desk-shell",
    component: () => import("components/desk/windows/GroupWindow.vue"),
  },
  {
    label: "Playback Rail",
    path: "playback-rail-window",
    parent: "desk-shell",
    component: () => import("components/desk/windows/PlaybackRailWindow.vue"),
  },
  {
    label: "2D Plot",
    path: "plot-window",
    parent: "desk-shell",
    component: () => import("components/desk/windows/PlotWindow.vue"),
  },
  {
    label: "Preset Grid",
    path: "preset-grid",
    parent: "desk-shell",
    component: () => import("components/desk/windows/PresetGridWindow.vue"),
  },
  {
    label: "Quick Programmer",
    path: "quick-programmer",
    parent: "desk-shell",
    component: () => import("components/desk/windows/QuickProgrammerWindow.vue"),
  },
  {
    label: "Widgets",
    path: "widgets-window",
    parent: "desk-shell",
    component: () => import("components/desk/windows/WidgetWindow.vue"),
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
