import { createWorkspaceWithPanels } from "./workspace";

export function showSettingsUI() {
  createWorkspaceWithPanels("Settings", [
    "/settings-general",
    "/settings-interface",
    "/settings-output-sync",
    "/settings-audio",
    "/settings-plot",
    "/settings-theme",
    "/settings-sidebar",
  ]);
}
