/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Workspace definitions are stored in a WorkspaceFile, since they are written to far more often than the general configuration file.
 * Persisted to appdata/workspace.yml.
 */
import * as YAML from 'yaml';

export class WorkspaceFile {
  version: number = 1;
  outerLayout: unknown = null;
  workspaceLayouts: Record<string, unknown> = {};
  activeWorkspaceId: string = '';

  /**
   * Takes a JSON object and merges it with the current workspace file.
   * The incoming JSON object is assumed to be from an older or newer
   * version of the workspace file.
   */
  static fromJSON(jsonObject: Record<string, unknown>): WorkspaceFile {
    const workspaceFile = new WorkspaceFile();
    Object.assign(workspaceFile, jsonObject);
    return workspaceFile;
  }

  static fromYAML(yamlString: string): WorkspaceFile {
    const workspaceFile = new WorkspaceFile();
    if (!yamlString || typeof yamlString !== 'string' || !yamlString.trim()) {
      return workspaceFile;
    }

    try {
      const parsed = YAML.parse(yamlString);
      if (parsed && typeof parsed === 'object') {
        return WorkspaceFile.fromJSON(parsed as Record<string, unknown>);
      }
    } catch (e) {
      console.error('Failed to parse workspace YAML:', e);
    }

    return workspaceFile;
  }

  toYAML(): string {
    return YAML.stringify({
      version: this.version,
      ...(this.activeWorkspaceId ? { activeWorkspaceId: this.activeWorkspaceId } : {}),
      ...(this.outerLayout != null ? { outerLayout: this.outerLayout } : {}),
      ...(Object.keys(this.workspaceLayouts || {}).length > 0
        ? { workspaceLayouts: this.workspaceLayouts }
        : {}),
    });
  }
}
