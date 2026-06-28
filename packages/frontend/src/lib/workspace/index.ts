/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useWorkspaceStore } from "src/stores/workspace";
import { WorkspacePanels } from "./panels";

export interface DockviewPanelLayout {
  id: string;
  contentComponent: string;
  params?: Record<string, unknown>;
  title?: string;
}

export interface DockviewLayout {
  grid: {
    root: unknown;
    width: number;
    height: number;
    orientation: "HORIZONTAL" | "VERTICAL";
  };
  panels: Record<string, DockviewPanelLayout>;
  activeGroup: string;
}

/**
 * Generates a standard Dockview layout configuration populated with the specified panels.
 */
function generateDockviewLayout(panels: string[]): DockviewLayout {
  const panelsMap: Record<string, DockviewPanelLayout> = {};
  const panelIds: string[] = [];

  panels.forEach((path) => {
    const cleanPath = path.replace(/^\//, "");
    const id = `panel-${cleanPath}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    panelIds.push(id);

    const match = WorkspacePanels.find((p) => p.path === cleanPath);
    const title = match
      ? match.label
      : cleanPath.charAt(0).toUpperCase() + cleanPath.slice(1);

    panelsMap[id] = {
      id,
      contentComponent: "WSPanelContent",
      params: {
        path: path.startsWith("/") ? path : `/${path}`,
      },
      title,
    };
  });

  const activeView = panelIds[0] || "";
  const root = {
    type: "branch" as const,
    data: [
      {
        type: "leaf" as const,
        data: {
          views: panelIds,
          activeView,
          id: "leaf-1",
        },
        size: 1000,
      }
    ],
    size: 1000,
  };

  return {
    grid: {
      root,
      width: 1000,
      height: 1000,
      orientation: "HORIZONTAL",
    },
    panels: panelsMap,
    activeGroup: "leaf-1",
  };
}

/**
 * Creates a new workspace with a given name and optional layout.
 */
export function createWorkspace(name: string, layout?: unknown): string {
  const store = useWorkspaceStore();
  return store.requestCreateWorkspace(name, layout);
}

/**
 * Creates a new workspace with a given name and populates it with a list of panel paths.
 */
export function createWorkspaceWithPanels(name: string, panels: string[]): string {
  const layout = generateDockviewLayout(panels);
  return createWorkspace(name, layout);
}

/**
 * Creates a new workspace from a pre-defined layout structure.
 */
export function createWorkspaceFromLayout(name: string, layout: unknown): string {
  return createWorkspace(name, layout);
}

export * from "./layouts";
export * from "./panels";
