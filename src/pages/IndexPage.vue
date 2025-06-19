<script setup lang="ts">
import GridConfig from 'src/components/GridConfig.vue';
import GridNode from 'src/components/GridNode.vue';
import TestPanel from 'src/components/TestPanel.vue';
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
      <div class="grid-node-container">
        <GridNode />
      </div>
      <TestPanel />
      <GridConfig />
    </div>
  </q-page>
</template>

<style scoped>
.grid-node-container {
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: #999;
  overflow: hidden;
  overflow-x: scroll;
}

.main-view {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 300px auto 1fr;
  overflow: hidden;
  position: absolute;
  inset: 0;
}

.config-view {
  overflow: hidden;
}
</style>
