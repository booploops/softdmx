<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { TimelineTrack } from '@softdmx/engine';
import { useTimelineEditorStore } from 'src/stores/timeline-editor';

const props = defineProps<{
  track: TimelineTrack;
}>();

const timelineEditor = useTimelineEditorStore();
</script>

<template>
  <div
    class="timeline-track-header"
    :class="{ 'timeline-track-header--disabled': props.track.enabled === false }"
  >
    <div class="timeline-track-header__name">{{ props.track.name }}</div>
    <div class="timeline-track-header__actions">
      <XButton
        flat
        size="sm"
        :color="props.track.enabled === false ? 'danger' : 'default'"
        :label="props.track.enabled === false ? 'Off' : 'On'"
        @click="timelineEditor.setTrackEnabled(props.track.id, props.track.enabled === false)"
      />
      <XButton
        flat
        size="sm"
        :color="props.track.solo ? 'primary' : 'default'"
        label="S"
        @click="timelineEditor.setTrackSolo(props.track.id, !props.track.solo)"
      />
    </div>
  </div>
</template>

<style scoped>
.timeline-track-header {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  height: 100%;
  padding: 8px 10px;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-elevated);
  box-sizing: border-box;
}

.timeline-track-header--disabled {
  opacity: 0.55;
}

.timeline-track-header__name {
  font-size: 12px;
  font-weight: 600;
  color: var(--sdmx-color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeline-track-header__actions {
  display: flex;
  gap: 4px;
}
</style>
