import { createWorkspaceWithPanels } from "./workspace";

export function showSettingsUI() {
  createWorkspaceWithPanels("Settings", ["/settings"]);
}
