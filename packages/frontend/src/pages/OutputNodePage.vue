<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { onMounted } from 'vue';
import { useOutputEngineStore } from 'src/stores/output-playback';

const output = useOutputEngineStore();

onMounted(() => {
  output.startEngine();
});
</script>

<template>
  <div class="output-node-page sdmx-surface q-pa-md">
    <div class="sdmx-text-title">SoftDMX Output Node</div>
    <div class="sdmx-text-caption">Headless merge + DMX output active.</div>
  </div>
</template>

<style scoped>
.output-node-page {
  min-height: 100vh;
}
</style>
