/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { signal, effect } from "alien-signals";
import { WorkspaceFile } from "@softdmx/shared";
import { Paths } from "../runtime/paths";
import fs from "fs";
import path from "path";

export function createWorkspaceStore() {
  const workspaceFile = signal<WorkspaceFile>(new WorkspaceFile());
  const workspacePath = path.join(Paths.appData, "workspace.xml");
  let isLoaded = false;

  function loadWorkspace() {
    if (isLoaded) return;

    try {
      if (fs.existsSync(workspacePath)) {
        const content = fs.readFileSync(workspacePath, "utf-8");
        workspaceFile(WorkspaceFile.fromXML(content));
      } else {
        if (!fs.existsSync(Paths.appData)) {
          fs.mkdirSync(Paths.appData, { recursive: true });
        }
        const initial = new WorkspaceFile();
        fs.writeFileSync(workspacePath, initial.toXML());
        workspaceFile(initial);
      }
    } catch (e) {
      console.error("Failed to load or create workspace.xml:", e);
    }

    isLoaded = true;

    effect(() => {
      try {
        if (!fs.existsSync(Paths.appData)) {
          fs.mkdirSync(Paths.appData, { recursive: true });
        }
        const data = workspaceFile();
        fs.writeFileSync(workspacePath, data.toXML());
      } catch (e) {
        console.error("Failed to save workspace.xml:", e);
      }
    });
  }

  function toCloneable<T>(val: T): T {
    if (val == null || typeof val !== 'object') return val;
    try {
      return JSON.parse(JSON.stringify(val));
    } catch {
      return val;
    }
  }

  function update(partial: {
    outerLayout?: unknown;
    workspaceLayouts?: Record<string, unknown>;
    activeWorkspaceId?: string;
  }) {
    const curr = workspaceFile();
    const nextData = {
      version: curr.version,
      outerLayout:
        partial.outerLayout !== undefined
          ? toCloneable(partial.outerLayout)
          : curr.outerLayout,
      workspaceLayouts:
        partial.workspaceLayouts !== undefined
          ? toCloneable(partial.workspaceLayouts)
          : curr.workspaceLayouts,
      activeWorkspaceId:
        partial.activeWorkspaceId !== undefined
          ? partial.activeWorkspaceId
          : curr.activeWorkspaceId,
    };
    const next = WorkspaceFile.fromJSON(nextData as any);
    workspaceFile(next);
    return next;
  }

  return { workspaceFile, load: loadWorkspace, update };
}

export const workspace = createWorkspaceStore();
