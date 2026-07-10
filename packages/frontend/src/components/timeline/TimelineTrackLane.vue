<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import type { TimelineClip, TimelineTrack } from '@softdmx/engine';
import { useTimelineEditorStore } from 'src/stores/timeline-editor';
import { useTimelineAudioStore } from 'src/stores/timeline-audio';
import TimelineClipBlock from './TimelineClipBlock.vue';
import TimelineSessionLane from './TimelineSessionLane.vue';

const props = defineProps<{
  track: TimelineTrack;
  widthPx: number;
  height?: number;
}>();

const emit = defineEmits<{
  'clip-pointer-down': [
    event: MouseEvent,
    payload: { clip: TimelineClip; mode: 'move' | 'resize'; trackId: string }
  ];
  'clip-click': [event: MouseEvent, clip: TimelineClip];
  'lane-pointer-down': [event: MouseEvent];
}>();

const timelineEditor = useTimelineEditorStore();
const timelineAudio = useTimelineAudioStore();
const audioCanvas = ref<HTMLCanvasElement | null>(null);

const pixelsPerSecond = computed(() => timelineEditor.pixelsPerSecond);
const isAudio = computed(() => props.track.kind === 'audio' || props.track.id === 'timeline-audio-lane');
const isAutomation = computed(() => props.track.kind === 'automation');

const displayClips = computed(() =>
  props.track.clips.map((clip) => ({
    clip,
    leftPx: clip.startSec * pixelsPerSecond.value,
    widthPx: Math.max(24, (clip.endSec - clip.startSec) * pixelsPerSecond.value),
  }))
);

function drawAudioWaveform() {
  if (!isAudio.value) return;
  const canvas = audioCanvas.value;
  const peaks = timelineAudio.primaryPeaks;
  const asset = timelineAudio.primaryAsset;
  if (!canvas || !asset || peaks.length === 0) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  const offsetPx = ((asset.offsetMs ?? 0) / 1000) * pixelsPerSecond.value;
  const durationPx = (asset.durationMs / 1000) * pixelsPerSecond.value;
  const barWidth = Math.max(1, durationPx / peaks.length);
  const centerY = height / 2;

  ctx.fillStyle = 'color-mix(in srgb, var(--sdmx-color-primary) 70%, transparent)';
  peaks.forEach((peak, index) => {
    const x = offsetPx + index * barWidth;
    const barHeight = Math.max(2, peak * (height - 8));
    ctx.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth * 0.8), barHeight);
  });
}

watch(
  () => [timelineAudio.primaryPeaks, timelineEditor.pixelsPerSecond, timelineAudio.primaryAsset?.offsetMs, props.widthPx],
  () => drawAudioWaveform(),
  { deep: true }
);

onMounted(() => drawAudioWaveform());
</script>

<template>
  <div
    class="timeline-track-lane"
    :style="{ width: `${props.widthPx}px`, height: `${props.height ?? 72}px` }"
    @mousedown="emit('lane-pointer-down', $event)"
  >
    <template v-if="isAudio">
      <canvas
        ref="audioCanvas"
        class="timeline-track-lane__waveform"
        :style="{ width: `${props.widthPx}px` }"
      />
      <div
        v-if="!timelineAudio.primaryAsset"
        class="timeline-track-lane__empty"
      >
        Import audio to align the set
      </div>
    </template>

    <template v-else-if="isAutomation">
      <TimelineClipBlock
        v-for="entry in displayClips"
        :key="entry.clip.id"
        :clip="entry.clip"
        :left-px="entry.leftPx"
        :width-px="entry.widthPx"
        kind="automation"
        @pointer-down="(event, mode) => emit('clip-pointer-down', event, { clip: entry.clip, mode, trackId: props.track.id })"
        @click="(event) => emit('clip-click', event, entry.clip)"
      />
      <TimelineSessionLane
        class="timeline-track-lane__events"
        :pixels-per-second="pixelsPerSecond"
        :timeline-width-px="props.widthPx"
      />
    </template>

    <template v-else>
      <TimelineClipBlock
        v-for="entry in displayClips"
        :key="entry.clip.id"
        :clip="entry.clip"
        :left-px="entry.leftPx"
        :width-px="entry.widthPx"
        :selected="Boolean(entry.clip.cueId && timelineEditor.selectedCueIds.includes(entry.clip.cueId))"
        kind="cue"
        @pointer-down="(event, mode) => emit('clip-pointer-down', event, { clip: entry.clip, mode, trackId: props.track.id })"
        @click="(event) => emit('clip-click', event, entry.clip)"
      />
      <div
        v-if="displayClips.length === 0"
        class="timeline-track-lane__empty"
      >
        Drop or add cues on this track
      </div>
    </template>
  </div>
</template>

<style scoped>
.timeline-track-lane {
  position: relative;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  background: color-mix(in srgb, var(--sdmx-color-bg-inset) 80%, transparent);
  overflow: hidden;
}

.timeline-track-lane__waveform {
  display: block;
  height: 100%;
}

.timeline-track-lane__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sdmx-color-text-faint);
  font-size: 12px;
  pointer-events: none;
}

.timeline-track-lane__events {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.85;
}
</style>
