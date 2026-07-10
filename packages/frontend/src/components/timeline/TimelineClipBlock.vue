<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { formatSmpte, type TimelineClip } from '@softdmx/engine';
import { useTimelineEditorStore } from 'src/stores/timeline-editor';

const props = defineProps<{
  clip: TimelineClip;
  leftPx: number;
  widthPx: number;
  selected?: boolean;
  kind?: 'cue' | 'automation';
}>();

const emit = defineEmits<{
  'pointer-down': [event: MouseEvent, mode: 'move' | 'resize'];
  click: [event: MouseEvent];
}>();

const timelineEditor = useTimelineEditorStore();
const fps = computed(() => timelineEditor.fps);
</script>

<template>
  <div
    class="timeline-clip"
    :class="{
      'timeline-clip--selected': props.selected,
      'timeline-clip--automation': props.kind === 'automation',
      'timeline-clip--muted': props.clip.muted,
    }"
    :style="{
      left: `${props.leftPx}px`,
      width: `${props.widthPx}px`,
      backgroundColor: props.clip.color
        ? `color-mix(in srgb, ${props.clip.color} 28%, var(--sdmx-color-bg-surface))`
        : undefined,
      borderColor: props.clip.color
        ? `color-mix(in srgb, ${props.clip.color} 60%, var(--sdmx-color-border-subtle))`
        : undefined,
    }"
    @mousedown="emit('pointer-down', $event, 'move')"
    @click.stop="emit('click', $event)"
  >
    <div class="timeline-clip__title">{{ props.clip.name }}</div>
    <div class="timeline-clip__meta">
      {{ formatSmpte(props.clip.startSec, fps) }}
    </div>
    <div
      v-if="props.kind !== 'automation'"
      class="timeline-clip__resize"
      @mousedown.stop="emit('pointer-down', $event, 'resize')"
    />
  </div>
</template>

<style scoped>
.timeline-clip {
  position: absolute;
  top: 8px;
  bottom: 8px;
  border-radius: var(--sdmx-radius-sm);
  border: 1px solid color-mix(in srgb, var(--sdmx-color-primary) 50%, var(--sdmx-color-border-subtle));
  background: color-mix(in srgb, var(--sdmx-color-primary) 18%, var(--sdmx-color-bg-surface));
  overflow: hidden;
  cursor: grab;
  box-sizing: border-box;
  min-width: 24px;
  z-index: 2;
}

.timeline-clip:active {
  cursor: grabbing;
}

.timeline-clip--selected {
  border-color: var(--sdmx-color-primary);
  box-shadow: 0 0 0 1px var(--sdmx-color-primary-ring);
  z-index: 3;
}

.timeline-clip--automation {
  border-color: color-mix(in srgb, var(--sdmx-color-warning) 55%, var(--sdmx-color-border-subtle));
  background: color-mix(in srgb, var(--sdmx-color-warning) 18%, var(--sdmx-color-bg-surface));
}

.timeline-clip--muted {
  opacity: 0.45;
}

.timeline-clip__title {
  padding: 4px 8px 0;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timeline-clip__meta {
  padding: 0 8px;
  font-size: 10px;
  color: var(--sdmx-color-text-muted);
  font-variant-numeric: tabular-nums;
}

.timeline-clip__resize {
  position: absolute;
  top: 0;
  right: 0;
  width: 10px;
  height: 100%;
  cursor: ew-resize;
  background: color-mix(in srgb, var(--sdmx-color-primary) 25%, transparent);
}
</style>
