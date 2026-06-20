<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { onMounted } from 'vue';
import { useRemoteAPI } from 'src/composables/useRemoteAPI';
import { useOutputEngineStore } from 'src/stores/output-engine';
import { useDMXStore } from 'src/stores/dmx';

useRemoteAPI();
const output = useOutputEngineStore();
const dmx = useDMXStore();

onMounted(() => {
  output.startEngine();
  dmx.init();
});
</script>

<template>
  <div class="output-node-page q-pa-md">
    <div class="text-h6">SoftDMX Output Node</div>
    <div class="text-caption text-grey-5">Headless merge + DMX output active.</div>
  </div>
</template>

<style scoped>
.output-node-page {
  min-height: 100vh;
  background: #111;
  color: #eee;
}
</style>
