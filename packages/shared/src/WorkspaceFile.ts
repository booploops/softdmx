/**
 * Workspace defintions are stored in a WorkspaceFile, since they are written to far more often than the general configuration file.
 */

export class WorkspaceFile {
  version: number = 1;

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
}
