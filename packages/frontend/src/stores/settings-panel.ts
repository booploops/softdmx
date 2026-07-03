/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

export type SettingsPanelTab = 'interface' | 'output' | 'sync' | 'audio' | 'plot' | 'theme';

const SETTINGS_TABS: SettingsPanelTab[] = ['interface', 'output', 'sync', 'audio', 'plot', 'theme'];

export const useSettingsPanelStore = defineStore('settings-panel', () => {
  const activeTab = ref<SettingsPanelTab>('interface');

  function setActiveTab(tab: SettingsPanelTab) {
    if (!SETTINGS_TABS.includes(tab)) return;
    activeTab.value = tab;
  }

  return {
    activeTab,
    setActiveTab,
  };
});
