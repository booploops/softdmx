/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { ConfigThemeSettings } from '@softdmx/shared';
import { DEFAULT_THEME_SETTINGS } from '@softdmx/shared';
import type { ThemeDefinition, ThemeOverrides, ThemePersistedState } from 'src/themes/types';
import { applyThemeDefinition } from 'src/themes/apply-theme';
import { deepMerge } from 'src/themes/merge';
import { parseImportedTheme } from 'src/themes/parse';
import { isElectronConfigEnv, persistConfigPatch } from 'src/lib/config-persistence';
import {
  builtinThemes,
  defaultDarkTheme,
  getBuiltinTheme,
} from 'src/themes/presets';

const STORAGE_KEY = 'softdmx-theme-state';

function readPersistedState(): ThemePersistedState {
  if (typeof localStorage === 'undefined') {
    return { activeThemeId: defaultDarkTheme.id, overrides: {} };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeThemeId: defaultDarkTheme.id, overrides: {} };
    const parsed = JSON.parse(raw) as ThemePersistedState;
    return {
      activeThemeId: parsed.activeThemeId ?? defaultDarkTheme.id,
      overrides: parsed.overrides ?? {},
    };
  } catch {
    return { activeThemeId: defaultDarkTheme.id, overrides: {} };
  }
}

function writePersistedState(state: ThemePersistedState): void {
  if (typeof localStorage === 'undefined' || isElectronConfigEnv) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function persistThemeConfig(activeThemeId: string, overrides: ThemeOverrides): void {
  if (!isElectronConfigEnv) return;
  persistConfigPatch({
    theme: {
      activeThemeId,
      overrides: overrides as Record<string, unknown>,
    },
  });
}

export const useThemeStore = defineStore('theme', () => {
  const persisted = isElectronConfigEnv
    ? { activeThemeId: DEFAULT_THEME_SETTINGS.activeThemeId, overrides: {} as ThemeOverrides }
    : readPersistedState();
  const activeThemeId = ref(persisted.activeThemeId);
  const overrides = ref<ThemeOverrides>(persisted.overrides);
  const importedThemes = ref<ThemeDefinition[]>([]);

  const availableThemes = computed(() => [...builtinThemes, ...importedThemes.value]);

  const activePreset = computed(() => {
    return (
      getBuiltinTheme(activeThemeId.value) ??
      importedThemes.value.find((theme) => theme.id === activeThemeId.value) ??
      defaultDarkTheme
    );
  });

  const resolvedTheme = computed<ThemeDefinition>(() => ({
    ...activePreset.value,
    tokens: deepMerge(activePreset.value.tokens, overrides.value.tokens),
  }));

  function persist() {
    writePersistedState({
      activeThemeId: activeThemeId.value,
      overrides: overrides.value,
    });
    persistThemeConfig(activeThemeId.value, overrides.value);
  }

  function applyConfigTheme(settings: ConfigThemeSettings) {
    activeThemeId.value = settings.activeThemeId;
    overrides.value = (settings.overrides ?? {}) as ThemeOverrides;
    applyActiveTheme();
  }

  function applyActiveTheme() {
    applyThemeDefinition(resolvedTheme.value, overrides.value.customCss ?? '');
  }

  function setActiveThemeId(id: string) {
    if (!availableThemes.value.some((theme) => theme.id === id)) return;
    activeThemeId.value = id;
    persist();
    applyActiveTheme();
  }

  function patchTokenOverrides(patch: ThemeOverrides['tokens']) {
    overrides.value = {
      ...overrides.value,
      tokens: deepMerge(overrides.value.tokens ?? {}, patch),
    };
    persist();
    applyActiveTheme();
  }

  function setCustomCss(css: string) {
    overrides.value = { ...overrides.value, customCss: css };
    persist();
    applyActiveTheme();
  }

  function resetOverrides() {
    overrides.value = {};
    persist();
    applyActiveTheme();
  }

  function importTheme(json: string): ThemeDefinition {
    const parsed = JSON.parse(json) as unknown;
    const theme = parseImportedTheme(parsed);
    if (!theme) {
      throw new Error('Invalid theme JSON. Expected id, name, and tokens.');
    }

    importedThemes.value = [
      ...importedThemes.value.filter((entry) => entry.id !== theme.id),
      theme,
    ];
    activeThemeId.value = theme.id;
    persist();
    applyActiveTheme();
    return theme;
  }

  function exportActiveTheme(): string {
    return JSON.stringify(resolvedTheme.value, null, 2);
  }

  function init() {
    applyActiveTheme();
  }

  return {
    activeThemeId,
    overrides,
    availableThemes,
    activePreset,
    resolvedTheme,
    setActiveThemeId,
    patchTokenOverrides,
    setCustomCss,
    resetOverrides,
    importTheme,
    exportActiveTheme,
    init,
    applyActiveTheme,
    applyConfigTheme,
  };
});
