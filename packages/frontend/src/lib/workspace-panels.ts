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
    label: "Programmer",
    path: "programmer-window",
    parent: "desk-shell",
    component: () => import("components/desk/windows/ProgrammerWindow.vue"),
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
