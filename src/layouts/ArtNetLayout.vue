<!--
  Copyright (C) 2025-Present booploops and contributors
  
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
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
