<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { ref } from 'vue';
import TimelineArrangement from 'src/components/timeline/TimelineArrangement.vue';
import TimelineSessionView from 'src/components/timeline/TimelineSessionView.vue';

const viewMode = ref<'arrangement' | 'session'>('arrangement');
</script>

<template>
  <div class="timeline-desk">
    <div class="timeline-desk__mode">
      <XButtonGroup size="sm">
        <XButton
          :color="viewMode === 'arrangement' ? 'primary' : 'default'"
          label="Arrangement"
          icon="timeline"
          @click="viewMode = 'arrangement'"
        />
        <XButton
          :color="viewMode === 'session' ? 'primary' : 'default'"
          label="Session"
          icon="layout-grid"
          @click="viewMode = 'session'"
        />
      </XButtonGroup>
    </div>
    <TimelineArrangement
      v-if="viewMode === 'arrangement'"
      class="timeline-desk-editor"
    />
    <TimelineSessionView
      v-else
      class="timeline-desk-editor"
    />
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

.timeline-desk__mode {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-toolbar);
}

.timeline-desk-editor {
  flex: 1 1 0;
  min-height: 0;
}
</style>
