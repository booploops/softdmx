<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { formatSmpte, formatTimelineSeconds, secondsToMs } from '@softdmx/engine';
import { useTimelineEditorStore } from 'src/stores/timeline-editor';
import { useTimelineAudioStore } from 'src/stores/timeline-audio';

const props = defineProps<{
  widthPx: number;
}>();

const timelineEditor = useTimelineEditorStore();
const timelineAudio = useTimelineAudioStore();

const pixelsPerSecond = computed(() => timelineEditor.pixelsPerSecond);
const fps = computed(() => timelineEditor.fps);

const rulerMarkers = computed(() => {
  const markers: { leftPx: number; label: string; smpte: string }[] = [];
  const stepSec = pixelsPerSecond.value >= 180 ? 1 : pixelsPerSecond.value >= 80 ? 5 : 10;
  const totalSec = timelineEditor.durationMs / 1000;
  for (let sec = 0; sec <= totalSec; sec += stepSec) {
    markers.push({
      leftPx: sec * pixelsPerSecond.value,
      label: formatTimelineSeconds(sec),
      smpte: formatSmpte(sec, fps.value),
    });
  }
  return markers;
});

function clientXToSeconds(clientX: number, target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  const x = clientX - rect.left + timelineEditor.scrollLeftPx;
  return Math.max(0, x / pixelsPerSecond.value);
}

function scrub(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement;
  timelineEditor.seekToMs(secondsToMs(clientXToSeconds(event.clientX, target)));
}

function onRulerPointerDown(event: MouseEvent) {
  if (event.button !== 0) return;
  event.preventDefault();
  const target = event.currentTarget as HTMLElement;
  scrub(event);

  const onMove = (moveEvent: MouseEvent) => {
    timelineEditor.seekToMs(secondsToMs(clientXToSeconds(moveEvent.clientX, target)));
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}
</script>

<template>
  <div
    class="timeline-ruler"
    :style="{ width: `${props.widthPx}px` }"
    @mousedown="onRulerPointerDown"
  >
    <div
      v-for="section in timelineEditor.sections"
      :key="section.id"
      class="timeline-ruler__section"
      :style="{
        left: `${section.startSec * pixelsPerSecond}px`,
        width: `${Math.max(1, (section.endSec - section.startSec) * pixelsPerSecond)}px`,
      }"
    >
      <span>{{ section.name }}</span>
    </div>
    <div
      v-for="marker in rulerMarkers"
      :key="`${marker.leftPx}-${marker.label}`"
      class="timeline-ruler__tick"
      :style="{ left: `${marker.leftPx}px` }"
    >
      <span class="timeline-ruler__seconds">{{ marker.label }}</span>
      <span class="timeline-ruler__smpte">{{ marker.smpte }}</span>
    </div>
    <div
      v-for="marker in timelineEditor.markers"
      :key="marker.id"
      class="timeline-ruler__marker timeline-ruler__marker--manual"
      :style="{ left: `${marker.timeSec * pixelsPerSecond}px` }"
      :title="marker.name"
    />
    <div
      v-for="(timeSec, index) in timelineAudio.transientMarkers"
      :key="`transient-${index}`"
      class="timeline-ruler__marker timeline-ruler__marker--transient"
      :style="{ left: `${timeSec * pixelsPerSecond}px` }"
    />
  </div>
</template>

<style scoped>
.timeline-ruler {
  position: relative;
  height: 44px;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  background: color-mix(in srgb, var(--sdmx-color-bg-surface) 92%, transparent);
  cursor: ew-resize;
  user-select: none;
}

.timeline-ruler__section {
  position: absolute;
  top: 2px;
  height: 16px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sdmx-color-secondary) 30%, transparent);
  border: 1px solid color-mix(in srgb, var(--sdmx-color-secondary) 55%, transparent);
  overflow: hidden;
  pointer-events: none;
}

.timeline-ruler__section span {
  display: block;
  padding: 0 8px;
  font-size: 10px;
  line-height: 16px;
  white-space: nowrap;
}

.timeline-ruler__tick {
  position: absolute;
  top: 18px;
  bottom: 0;
  width: 1px;
  background: var(--sdmx-color-border-subtle);
  pointer-events: none;
}

.timeline-ruler__seconds,
.timeline-ruler__smpte {
  position: absolute;
  left: 4px;
  font-size: 10px;
  color: var(--sdmx-color-text-muted);
  white-space: nowrap;
}

.timeline-ruler__seconds {
  top: 0;
}

.timeline-ruler__smpte {
  top: 12px;
  opacity: 0.75;
}

.timeline-ruler__marker {
  position: absolute;
  top: 18px;
  bottom: 0;
  width: 2px;
  pointer-events: none;
}

.timeline-ruler__marker--manual {
  background: var(--sdmx-color-accent);
}

.timeline-ruler__marker--transient {
  background: color-mix(in srgb, var(--sdmx-color-info) 60%, transparent);
}
</style>
