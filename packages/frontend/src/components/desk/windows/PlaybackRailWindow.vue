<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import PlaybackRail from '../PlaybackRail.vue';
</script>

<template>
  <div class="playback-rail-window">
    <PlaybackRail />
  </div>
</template>

<style scoped>
.playback-rail-window {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.playback-rail-window :deep(.playback-rail) {
  flex: 1 1 auto;
  min-height: 0;
  border-top: 0;
  background: transparent;
}
</style>
