<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import SetTimelineEditor from 'src/components/SetTimelineEditor.vue';
</script>

<template>
  <div class="timeline-desk">
    <SetTimelineEditor embedded class="timeline-desk-editor" />
  </div>
</template>

<style scoped>
.timeline-desk {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

.timeline-desk-editor {
  flex: 1 1 0;
  min-height: 0;
}
</style>
