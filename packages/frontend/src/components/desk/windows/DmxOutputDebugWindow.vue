<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import DmxOutputDebugPanel from 'src/components/debug/DmxOutputDebugPanel.vue';
</script>

<template>
  <div class="dmx-output-debug-window">
    <DmxOutputDebugPanel />
  </div>
</template>

<style scoped>
.dmx-output-debug-window {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
