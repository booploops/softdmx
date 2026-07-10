<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import TimelineArrangement from 'src/components/timeline/TimelineArrangement.vue';

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });
defineEmits<{ close: [] }>();
</script>

<template>
  <div class="set-timeline-editor">
    <TimelineArrangement />
  </div>
</template>

<style scoped>
.set-timeline-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
</style>
