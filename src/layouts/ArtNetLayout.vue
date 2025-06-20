<script setup lang="ts">
import GridNode from 'src/components/GridNode.vue';
import { useDMXStore } from 'src/stores/dmx';

const dmx = useDMXStore();
</script>

<template>
  <div class="artnet-layout">
    <GridNode />
  </div>
</template>

<style lang="scss" scoped>
.artnet-layout {
  position: fixed;
  inset:0;

  // electron window drag
  -webkit-app-region: drag;
}
</style>
