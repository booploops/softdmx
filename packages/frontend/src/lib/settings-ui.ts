/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createWorkspaceWithPanels } from "./workspace";
type SettingsFocus = "interface" | "output" | "sync" | "audio" | "plot" | "theme" | "general";

const PANEL_BY_FOCUS: Record<SettingsFocus, string> = {
  general: "/settings-general",
  interface: "/settings-interface",
  output: "/settings-output-sync",
  sync: "/settings-sync",
  audio: "/settings-audio",
  plot: "/settings-plot",
  theme: "/settings-theme",
};

const DEFAULT_SETTINGS_PANELS = [
  "/settings-general",
  "/settings-interface",
  "/settings-output-sync",
  "/settings-sync",
  "/settings-audio",
  "/settings-plot",
  "/settings-theme",
  "/settings-sidebar",
];

export function showSettingsUI(focus: SettingsFocus = "general") {
  const first = PANEL_BY_FOCUS[focus] ?? "/settings-general";
  const orderedPanels = [
    first,
    ...DEFAULT_SETTINGS_PANELS.filter((panel) => panel !== first),
  ];

  createWorkspaceWithPanels("Settings", orderedPanels);
}
