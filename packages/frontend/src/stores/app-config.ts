/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { ConfigFileData } from '@softdmx/shared';
import {
  hasConfigLocalModifications,
  isElectronConfigEnv,
  setConfigHydrated,
} from 'src/lib/config-persistence';
import { trpc } from 'src/lib/trpc';
import type { SidebarShortcutId } from 'src/lib/sidebar-shortcuts';
import { usePlotSettingsStore } from 'src/stores/plot-settings';
import { useThemeStore } from 'src/stores/theme';
import { useUIStore } from 'src/stores/ui';

type RemoteConfig = Pick<ConfigFileData, 'interface' | 'sidebar' | 'theme' | 'plot'>;

export const useAppConfigStore = defineStore('app-config', () => {
  const isHydrated = ref(!isElectronConfigEnv);
  let hydratePromise: Promise<void> | null = null;

  function applyRemoteConfig(remote: RemoteConfig) {
    const uiStore = useUIStore();
    const themeStore = useThemeStore();
    const plotSettings = usePlotSettingsStore();

    uiStore.applyConfigInterface(remote.interface);
    uiStore.applyConfigSidebar(remote.sidebar);
    themeStore.applyConfigTheme(remote.theme);
    plotSettings.applyConfigPlot(remote.plot);
  }

  function ensureHydrated(): Promise<void> {
    if (!isElectronConfigEnv) {
      isHydrated.value = true;
      return Promise.resolve();
    }
    if (hydratePromise) return hydratePromise;

    hydratePromise = trpc.getConfig
      .query()
      .then((remote) => {
        if (remote && !hasConfigLocalModifications()) {
          applyRemoteConfig(remote as RemoteConfig);
        }
        isHydrated.value = true;
        setConfigHydrated(true);
      })
      .catch((error: unknown) => {
        console.error('Failed to load config via tRPC:', error);
        isHydrated.value = true;
        setConfigHydrated(true);
      });

    return hydratePromise;
  }

  if (isElectronConfigEnv) {
    ensureHydrated();
  }

  return {
    hydrated: isHydrated,
    ensureHydrated,
  };
});

export type { SidebarShortcutId };
