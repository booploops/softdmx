/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { z } from "zod";

export const sidebarShortcutOpenModeSchema = z.enum(["current-workspace", "new-workspace"]);
export const sidebarShortcutNewWorkspacePolicySchema = z.enum(["always-new", "reuse-existing"]);
export const plotAlignModeSchema = z.enum(["row", "column"]);

export const configInterfaceSettingsSchema = z.object({
  programmerCollapsed: z.boolean().default(false),
  cueBarCollapsed: z.boolean().default(false),
  showWelcomeOnStartup: z.boolean().default(true),
});

export const configSidebarSettingsSchema = z.object({
  showOperateLockIcon: z.boolean().default(true),
  shortcutIds: z.array(z.string()).default([]),
  shortcutOpenMode: sidebarShortcutOpenModeSchema.default("new-workspace"),
  newWorkspacePolicy: sidebarShortcutNewWorkspacePolicySchema.default("always-new"),
});

export const configThemeSettingsSchema = z.object({
  activeThemeId: z.string().default("default-dark"),
  dockviewTheme: z.string().default("dark"),
  overrides: z.record(z.string(), z.unknown()).default({}),
});

export const configPlotSettingsSchema = z.object({
  showGrid2d: z.boolean().default(true),
  showLabels2d: z.boolean().default(true),
  showCenter2d: z.boolean().default(true),
  showGrid3d: z.boolean().default(true),
  showStagePlane3d: z.boolean().default(true),
  enableOrbit3d: z.boolean().default(true),
  enableDrag: z.boolean().default(true),
  snapEnabled: z.boolean().default(true),
  snapStep: z.number().finite().default(1),
  autoAlignMode: plotAlignModeSchema.default("row"),
});

export type SidebarShortcutOpenMode = z.infer<typeof sidebarShortcutOpenModeSchema>;
export type SidebarShortcutNewWorkspacePolicy = z.infer<typeof sidebarShortcutNewWorkspacePolicySchema>;
export type PlotAlignMode = z.infer<typeof plotAlignModeSchema>;
export type ConfigInterfaceSettings = z.infer<typeof configInterfaceSettingsSchema>;
export type ConfigSidebarSettings = z.infer<typeof configSidebarSettingsSchema>;
export type ConfigThemeSettings = z.infer<typeof configThemeSettingsSchema>;
export type ConfigPlotSettings = z.infer<typeof configPlotSettingsSchema>;

export type ConfigFileData = {
  version: number;
  interface: ConfigInterfaceSettings;
  sidebar: ConfigSidebarSettings;
  theme: ConfigThemeSettings;
  plot: ConfigPlotSettings;
};

export const configInterfaceSettingsPatchSchema = z.object({
  programmerCollapsed: z.boolean().optional(),
  cueBarCollapsed: z.boolean().optional(),
  showWelcomeOnStartup: z.boolean().optional(),
});

export const configSidebarSettingsPatchSchema = z.object({
  showOperateLockIcon: z.boolean().optional(),
  shortcutIds: z.array(z.string()).optional(),
  shortcutOpenMode: sidebarShortcutOpenModeSchema.optional(),
  newWorkspacePolicy: sidebarShortcutNewWorkspacePolicySchema.optional(),
});

export const configThemeSettingsPatchSchema = z.object({
  activeThemeId: z.string().optional(),
  dockviewTheme: z.string().optional(),
  overrides: z.record(z.string(), z.unknown()).optional(),
});

export const configPlotSettingsPatchSchema = z.object({
  showGrid2d: z.boolean().optional(),
  showLabels2d: z.boolean().optional(),
  showCenter2d: z.boolean().optional(),
  showGrid3d: z.boolean().optional(),
  showStagePlane3d: z.boolean().optional(),
  enableOrbit3d: z.boolean().optional(),
  enableDrag: z.boolean().optional(),
  snapEnabled: z.boolean().optional(),
  snapStep: z.number().finite().optional(),
  autoAlignMode: plotAlignModeSchema.optional(),
});

export const configPatchSchema = z.object({
  interface: configInterfaceSettingsPatchSchema.optional(),
  sidebar: configSidebarSettingsPatchSchema.optional(),
  theme: configThemeSettingsPatchSchema.optional(),
  plot: configPlotSettingsPatchSchema.optional(),
});

export type ConfigPatch = z.infer<typeof configPatchSchema>;

const configFileInputSchema = z.object({
  version: z.number().int().optional(),
  interface: z.unknown().optional(),
  sidebar: z.unknown().optional(),
  theme: z.unknown().optional(),
  plot: z.unknown().optional(),
});

export function parseConfigFile(input: unknown): ConfigFileData {
  const raw = configFileInputSchema.parse(input ?? {});

  return {
    version: raw.version ?? 1,
    interface: configInterfaceSettingsSchema.parse(raw.interface ?? {}),
    sidebar: configSidebarSettingsSchema.parse(raw.sidebar ?? {}),
    theme: configThemeSettingsSchema.parse(raw.theme ?? {}),
    plot: configPlotSettingsSchema.parse(raw.plot ?? {}),
  };
}

export const configFileSchema = configFileInputSchema.transform(parseConfigFile);

export function parseConfigPatch(input: unknown): ConfigPatch {
  return configPatchSchema.parse(input ?? {});
}

export function mergeConfigPatch(current: ConfigFileData, patch: ConfigPatch): ConfigFileData {
  const validated = parseConfigPatch(patch);

  return parseConfigFile({
    version: current.version,
    interface: validated.interface ? { ...current.interface, ...validated.interface } : current.interface,
    sidebar: validated.sidebar ? { ...current.sidebar, ...validated.sidebar } : current.sidebar,
    theme: validated.theme
      ? {
          ...current.theme,
          ...validated.theme,
          overrides:
            validated.theme.overrides !== undefined ? validated.theme.overrides : current.theme.overrides,
        }
      : current.theme,
    plot: validated.plot ? { ...current.plot, ...validated.plot } : current.plot,
  });
}

export function createDefaultConfigFile(): ConfigFileData {
  return parseConfigFile({});
}

export function applyConfigPatch(current: ConfigFileData, patch: ConfigPatch): ConfigFileData {
  return mergeConfigPatch(current, patch);
}

const defaultConfig = createDefaultConfigFile();

export const DEFAULT_INTERFACE_SETTINGS = defaultConfig.interface;
export const DEFAULT_SIDEBAR_SETTINGS = defaultConfig.sidebar;
export const DEFAULT_THEME_SETTINGS = defaultConfig.theme;
export const DEFAULT_PLOT_SETTINGS = defaultConfig.plot;
