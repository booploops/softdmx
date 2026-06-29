<script setup lang="ts">
import { computed } from 'vue';
import XCard from 'src/components/controls/XCard.vue';
import XSelect from 'src/components/controls/XSelect.vue';
import XSwitch from 'src/components/controls/XSwitch.vue';
import { useAudioStore } from 'src/stores/audio';
import { useDeskViewStore } from 'src/stores/desk-view';
import { useShowStore } from 'src/stores/show';
import { useThemeStore } from 'src/stores/theme';

const deskView = useDeskViewStore();
const audioStore = useAudioStore();
const themeStore = useThemeStore();
const showStore = useShowStore();

const themeOptions = computed(() =>
  themeStore.availableThemes.map((theme) => ({
    label: theme.name,
    value: theme.id,
  }))
);

const debugToolsEnabled = computed({
  get: () => showStore.document.general?.debugToolsEnabled ?? true,
  set: (value: boolean) => {
    showStore.updateDocument((doc) => {
      doc.general = {
        ...doc.general,
        debugToolsEnabled: value,
      };

      if (!value && doc.desk?.views) {
        doc.desk.views = doc.desk.views.map((view) => ({
          ...view,
          panes: view.panes.filter((pane) => pane.windowType !== 'dmx-debug'),
        }));
      }
    });
  },
});
</script>

<template>
  <XCard title="General">
    <div class="q-gutter-y-md">
      <div class="text-body2 text-grey-5">
        Quick controls for common app preferences.
      </div>

      <XSelect
        :model-value="deskView.activeViewId"
        :options="deskView.views.map((view) => ({ label: view.name, value: view.id }))"
        label="Default desk view"
        @update:model-value="deskView.setActiveView"
      />

      <XSelect
        :model-value="themeStore.activeThemeId"
        :options="themeOptions"
        label="Theme preset"
        @update:model-value="themeStore.setActiveThemeId"
      />

      <XSwitch
        v-model="audioStore.enabled"
        :disable="!audioStore.isSupported"
        label="Enable audio analysis"
      />

      <XSwitch
        v-model="debugToolsEnabled"
        label="Enable debugging tools"
      />
    </div>
  </XCard>
</template>
