<script setup lang="ts">
import XTab from 'src/components/controls/XTab.vue';
import XTabs from 'src/components/controls/XTabs.vue';
import SettingsAudioSection from 'src/components/settings/SettingsAudioSection.vue';
import SettingsInterfaceSection from 'src/components/settings/SettingsInterfaceSection.vue';
import SettingsOutputSection from 'src/components/settings/SettingsOutputSection.vue';
import SettingsSyncSection from 'src/components/settings/SettingsSyncSection.vue';
import SettingsPlotSection from 'src/components/settings/SettingsPlotSection.vue';
import SettingsThemeSection from 'src/components/settings/SettingsThemeSection.vue';
import { useSettingsPanelStore } from 'src/stores/settings-panel';

const settingsPanelStore = useSettingsPanelStore();
</script>

<template>
    <div class="settings-page q-pa-lg">
        <div class="settings-page__header q-mb-lg">
            <div class="text-h4 text-weight-bold">Settings</div>
            <div class="text-subtitle2 text-grey-5">Unified control surface for interface, output, sync, audio, plot, and theme.</div>
        </div>

        <XTabs v-model="settingsPanelStore.activeTab" class="settings-tabs" align="left">
            <XTab name="interface" icon="dashboard_customize" label="Interface" />
            <XTab name="output" icon="settings_input_component" label="Output" />
            <XTab name="sync" icon="sync" label="Sync" />
            <XTab name="audio" icon="graphic_eq" label="Audio" />
            <XTab name="plot" icon="view_in_ar" label="Plot" />
            <XTab name="theme" icon="palette" label="Theme" />
        </XTabs>

        <q-tab-panels v-model="settingsPanelStore.activeTab" class="settings-tab-content q-mt-md" animated>
            <q-tab-panel name="interface" class="settings-tab-panel">
                <SettingsInterfaceSection />
            </q-tab-panel>
            <q-tab-panel name="output" class="settings-tab-panel">
                <SettingsOutputSection />
            </q-tab-panel>
            <q-tab-panel name="sync" class="settings-tab-panel">
                <SettingsSyncSection />
            </q-tab-panel>
            <q-tab-panel name="audio" class="settings-tab-panel">
                <SettingsAudioSection />
            </q-tab-panel>
            <q-tab-panel name="plot" class="settings-tab-panel">
                <SettingsPlotSection />
            </q-tab-panel>
            <q-tab-panel name="theme" class="settings-tab-panel">
                <SettingsThemeSection />
            </q-tab-panel>
        </q-tab-panels>
    </div>
</template>

<style scoped lang="scss">
.settings-page {
    width: 100%;
}

.settings-page__header {
    max-width: 1100px;
}

.settings-tabs {
    max-width: 1100px;
}

.settings-tab-content {
    max-width: 1100px;
    background: transparent;
    padding: 0;
}

.settings-tab-panel {
    padding: 0;
}
</style>
