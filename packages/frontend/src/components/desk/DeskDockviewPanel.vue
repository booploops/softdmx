<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { IDockviewPanelProps } from 'dockview-vue';
import DeskWindowHost from './DeskWindowHost.vue';
import type { DeskPane } from '@softdmx/engine';

const props = defineProps<{
  params: IDockviewPanelProps<{ pane: DeskPane }>;
}>();
</script>

<template>
  <div class="desk-dockview-panel">
    <DeskWindowHost
      v-if="props.params.params?.pane"
      :pane="props.params.params.pane"
    />
    <div
      v-else
      class="q-pa-md sdmx-text-muted"
    >Loading pane...</div>
  </div>
</template>

<style scoped>
.desk-dockview-panel {
  width: 100%;
  height: 100%;
  background: var(--sdmx-color-bg-surface);
  color: var(--sdmx-color-text);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
