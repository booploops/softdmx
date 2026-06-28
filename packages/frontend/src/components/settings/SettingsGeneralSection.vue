<script setup lang="ts">
import { computed } from 'vue';
import XCard from 'src/components/controls/XCard.vue';
import XSelect from 'src/components/controls/XSelect.vue';
import XSwitch from 'src/components/controls/XSwitch.vue';
import { useAudioStore } from 'src/stores/audio';
import { useDeskViewStore } from 'src/stores/desk-view';
import { useThemeStore } from 'src/stores/theme';
import { useUIStore } from 'src/stores/ui';

const uiStore = useUIStore();
const deskView = useDeskViewStore();
const audioStore = useAudioStore();
const themeStore = useThemeStore();

const themeOptions = computed(() =>
  themeStore.availableThemes.map((theme) => ({
    label: theme.name,
    value: theme.id,
  }))
);
</script>

<template>
  <XCard title="General">
    <div class="q-gutter-y-md">
      <div class="text-body2 text-grey-5">
        Quick controls for common app preferences.
      </div>

      <XSwitch
        :model-value="uiStore.operateLocked"
        label="Operate lock (hide config UI in Live)"
        @update:model-value="uiStore.toggleOperateLock"
      />

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
    </div>
  </XCard>
</template>
