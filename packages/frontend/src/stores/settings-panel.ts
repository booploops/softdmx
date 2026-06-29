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
