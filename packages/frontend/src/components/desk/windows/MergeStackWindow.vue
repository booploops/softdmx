<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import MergeStackPanel from './MergeStackPanel.vue';
import ScratchConflictPanel from 'src/components/programmer/ScratchConflictPanel.vue';
</script>

<template>
  <div class="merge-stack-window">
    <div class="merge-stack-window__section">
      <div class="text-subtitle2 q-px-sm q-pt-sm">Merge stack</div>
      <MergeStackPanel />
    </div>
    <div class="merge-stack-window__section">
      <div class="text-subtitle2 q-px-sm q-pt-sm">Conflicts</div>
      <ScratchConflictPanel class="q-px-sm q-pb-sm" />
    </div>
  </div>
</template>

<style scoped>
.merge-stack-window {
  display: grid;
  grid-template-rows: 1fr 1fr;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.merge-stack-window__section {
  min-height: 0;
  overflow: auto;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}

.merge-stack-window__section:last-child {
  border-bottom: 0;
}
</style>
