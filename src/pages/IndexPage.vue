<!--
  Copyright (C) 2025-Present booploops and contributors
  
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import GridConfig from 'src/components/GridConfig.vue';
import GridNode from 'src/components/GridNode.vue';
import GridToolbar from 'src/components/GridToolbar.vue';
import RecorderBar from 'src/components/RecorderBar.vue';
import { TestShowfile } from 'src/shows/TestShowfile';
import { useDMXStore } from 'src/stores/dmx';

const dmx = useDMXStore();

onMounted(() => {
  dmx.loadShowfile(TestShowfile);
  // @ts-ignore
  window.$dmx = dmx; // Expose DMX store globally for debugging
})
</script>


<template>
  <q-page class="">
    <div class="main-view">
      <GridToolbar />
      <GridConfig />
      <RecorderBar />
    </div>
  </q-page>
</template>

<style scoped>
.grid-node-container {
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  overflow-x: scroll;
}

.main-view {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: absolute;
  inset: 0;
}

.config-view {
  overflow: hidden;
}
</style>
