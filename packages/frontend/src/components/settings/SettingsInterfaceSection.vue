<script setup lang="ts">
import XCard from 'src/components/controls/XCard.vue';
import XSelect from 'src/components/controls/XSelect.vue';
import XSwitch from 'src/components/controls/XSwitch.vue';
import { useDeskViewStore } from 'src/stores/desk-view';
import { useUIStore } from 'src/stores/ui';

const uiStore = useUIStore();
const deskView = useDeskViewStore();
</script>

<template>
  <XCard title="Interface">
    <div class="q-gutter-y-md">
      <XSelect
        :model-value="deskView.activeViewId"
        :options="deskView.views.map((view) => ({ label: view.name, value: view.id }))"
        label="Default desk view"
        @update:model-value="deskView.setActiveView"
      />

      <div class="row q-col-gutter-sm">
        <div class="col-12 col-md-6">
          <XSwitch v-model="uiStore.programmerCollapsed" label="Collapse programmer by default" />
        </div>
        <div class="col-12 col-md-6">
          <XSwitch v-model="uiStore.cueBarCollapsed" label="Collapse cue bar by default" />
        </div>
      </div>
    </div>
  </XCard>
</template>
