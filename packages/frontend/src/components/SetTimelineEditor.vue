<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useCueStore } from 'src/stores/cue';
import { useShowStore } from 'src/stores/show';
import { useTimecodeStore } from 'src/stores/timecode';
import { useTimelineAudioStore } from 'src/stores/timeline-audio';
import { useTimelineEditorStore } from 'src/stores/timeline-editor';
import { useUIStore } from 'src/stores/ui';
import {
  getCueTimecodeInSeconds,
  getCueTimecodeOutSeconds,
} from '@softdmx/engine';
import { getCueTotalDuration } from '@softdmx/engine';
import { formatSmpte, formatTimelineSeconds, msToSeconds, parseSmpteInput, secondsToMs } from '@softdmx/engine';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });
const emit = defineEmits<{ close: [] }>();

const cueStore = useCueStore();
const showStore = useShowStore();
const timecodeStore = useTimecodeStore();
const timelineEditor = useTimelineEditorStore();
const timelineAudio = useTimelineAudioStore();
const ui = useUIStore();

const timelineViewport = ref<HTMLElement | null>(null);
const audioCanvas = ref<HTMLCanvasElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const dragState = ref<{
  cueId: string;
  mode: 'move' | 'resize';
  startX: number;
  originInSec: number;
  originOutSec: number;
} | null>(null);

const pixelsPerSecond = computed(() => timelineEditor.pixelsPerSecond);
const durationMs = computed(() => timelineEditor.durationMs);
const timelineWidthPx = computed(() => (durationMs.value / 1000) * pixelsPerSecond.value);
const fps = computed(() => timelineEditor.fps);

const playheadLeftPx = computed(() => (timelineEditor.playheadMs / 1000) * pixelsPerSecond.value);

const rulerMarkers = computed(() => {
  const markers: { leftPx: number; label: string; smpte: string }[] = [];
  const stepSec = pixelsPerSecond.value >= 180 ? 1 : pixelsPerSecond.value >= 80 ? 5 : 10;
  const totalSec = durationMs.value / 1000;

  for (let sec = 0; sec <= totalSec; sec += stepSec) {
    markers.push({
      leftPx: sec * pixelsPerSecond.value,
      label: formatTimelineSeconds(sec),
      smpte: formatSmpte(sec, fps.value),
    });
  }

  return markers;
});

const cueBlocks = computed(() =>
  timelineEditor.timelineCues.map((cue) => {
    const inSec = getCueTimecodeInSeconds(cue) ?? 0;
    const outSec = getCueTimecodeOutSeconds(cue) ?? inSec + Math.max(1, getCueTotalDuration(cue) / 1000);
    return {
      cue,
      inSec,
      outSec,
      leftPx: inSec * pixelsPerSecond.value,
      widthPx: Math.max(24, (outSec - inSec) * pixelsPerSecond.value),
    };
  })
);

const selectedCue = computed(() =>
  showStore.document.cues.find((cue) => cue.id === timelineEditor.selectedCueId) ?? null
);

const selectedCueInSmpte = computed({
  get: () => {
    if (!selectedCue.value) return '00:00:00:00';
    return formatSmpte(getCueTimecodeInSeconds(selectedCue.value) ?? 0, fps.value);
  },
  set: (value: string) => {
    if (!selectedCue.value) return;
    const parsed = parseSmpteInput(value, fps.value);
    if (parsed === null) return;
    timelineEditor.assignCueTimecodeIn(selectedCue.value.id, parsed);
  },
});

const selectedCueOutSmpte = computed({
  get: () => {
    if (!selectedCue.value) return '00:00:00:00';
    const outSec = getCueTimecodeOutSeconds(selectedCue.value);
    return formatSmpte(outSec ?? 0, fps.value);
  },
  set: (value: string) => {
    if (!selectedCue.value) return;
    const parsed = parseSmpteInput(value, fps.value);
    if (parsed === null) return;
    timelineEditor.assignCueTimecodeOut(selectedCue.value.id, parsed);
  },
});

const playheadSmpte = computed(() => formatSmpte(msToSeconds(timelineEditor.playheadMs), fps.value));
const playheadProgress = computed(() => {
  if (durationMs.value <= 0) return 0;
  return Math.min(1, timelineEditor.playheadMs / durationMs.value);
});

const timelineCueOptions = computed(() =>
  timelineEditor.timelineCues.map((cue) => ({ label: cue.name, value: cue.id }))
);

const showAdvancedControls = ref(false);

function pxToSeconds(px: number) {
  return Math.max(0, px / pixelsPerSecond.value);
}

function handleTimelineClick(event: MouseEvent) {
  if (!timelineViewport.value || dragState.value) return;
  const rect = timelineViewport.value.getBoundingClientRect();
  const x = event.clientX - rect.left + timelineEditor.scrollLeftPx;
  timelineEditor.seekToMs(secondsToMs(pxToSeconds(x)));
}

function startCueDrag(event: MouseEvent, cueId: string, mode: 'move' | 'resize') {
  event.stopPropagation();
  const cue = showStore.document.cues.find((entry) => entry.id === cueId);
  if (!cue) return;

  timelineEditor.setSelectedCue(cueId);
  dragState.value = {
    cueId,
    mode,
    startX: event.clientX,
    originInSec: getCueTimecodeInSeconds(cue) ?? 0,
    originOutSec: getCueTimecodeOutSeconds(cue) ?? 0,
  };
}

function onPointerMove(event: MouseEvent) {
  if (!dragState.value) return;
  const deltaSec = (event.clientX - dragState.value.startX) / pixelsPerSecond.value;

  if (dragState.value.mode === 'move') {
    timelineEditor.assignCueTimecodeIn(dragState.value.cueId, dragState.value.originInSec + deltaSec);
    return;
  }

  timelineEditor.assignCueTimecodeOut(dragState.value.cueId, dragState.value.originOutSec + deltaSec);
}

function onPointerUp() {
  dragState.value = null;
}

function openCueContentEditor() {
  if (!selectedCue.value) {
    timelineEditor.ensureTimelineCue('Set Cue');
  } else {
    cueStore.activeCueId = selectedCue.value.id;
  }
  ui.openDialog('cueEditor');
}

function addTimelineCue() {
  const cueId = timelineEditor.ensureTimelineCue(`Cue ${timelineEditor.timelineCues.length + 1}`);
  timelineEditor.assignCueTimecodeIn(cueId, msToSeconds(timelineEditor.playheadMs));
  timelineEditor.setSelectedCue(cueId);
}

function triggerAudioImport() {
  fileInput.value?.click();
}

async function onAudioFilePicked(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file) return;
  await timelineAudio.importAudioFile(file);
  drawAudioWaveform();
}

function drawAudioWaveform() {
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

function handleProgressClick(event: MouseEvent) {
  const progressBar = event.currentTarget as HTMLElement;
  const rect = progressBar.getBoundingClientRect();
  const progressPercent = (event.clientX - rect.left) / rect.width;
  timelineEditor.seekToMs(Math.round(progressPercent * durationMs.value));
}

function leaveEditor() {
  timelineEditor.stop();
  timelineEditor.setPreviewEnabled(false);
  timelineAudio.stopAudio();
  if (props.embedded) {
    ui.setMode('live');
    return;
  }
  emit('close');
}

function closeEditor() {
  leaveEditor();
}

watch(
  () => [timelineAudio.primaryPeaks, timelineEditor.pixelsPerSecond, timelineAudio.primaryAsset?.offsetMs],
  () => drawAudioWaveform(),
  { deep: true }
);

watch(
  () => timecodeStore.positionSeconds,
  () => {
    if (timelineEditor.syncMode === 'timecode' && timecodeStore.enabled) {
      timelineEditor.syncPlayheadFromTimecode();
    }
  }
);

onMounted(() => {
  timelineEditor.setPreviewEnabled(true);
  if (timelineEditor.timelineCues.length === 0) {
    timelineEditor.ensureTimelineCue('Main Set');
  }
  if (!timelineEditor.selectedCueId && timelineEditor.timelineCues[0]) {
    timelineEditor.setSelectedCue(timelineEditor.timelineCues[0].id);
  }
  void timelineAudio.prepareAudioElement().then(drawAudioWaveform);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
});

onUnmounted(() => {
  timelineEditor.stopPlaybackLoop();
  timelineEditor.setPreviewEnabled(false);
  timelineAudio.disposeAudioElement();
  window.removeEventListener('mousemove', onPointerMove);
  window.removeEventListener('mouseup', onPointerUp);
});
</script>

<template>
  <div class="set-timeline-editor">
    <div class="editor-body">
      <div class="timeline-panel">
        <div class="timeline-scroll" ref="timelineViewport" @click="handleTimelineClick">
          <div class="timeline-canvas" :style="{ width: `${timelineWidthPx}px` }">
            <div class="timeline-ruler">
              <div
                v-for="marker in rulerMarkers"
                :key="`${marker.leftPx}-${marker.label}`"
                class="ruler-marker"
                :style="{ left: `${marker.leftPx}px` }"
              >
                <span class="ruler-seconds">{{ marker.label }}</span>
                <span class="ruler-smpte">{{ marker.smpte }}</span>
              </div>
            </div>

            <div class="timeline-lane audio-lane">
              <div class="lane-label">Audio</div>
              <canvas ref="audioCanvas" class="audio-waveform" :style="{ width: `${timelineWidthPx}px` }" />
              <div v-if="!timelineAudio.primaryAsset" class="lane-empty">Import an audio file to align your set.</div>
            </div>

            <div class="timeline-lane cue-lane">
              <div class="lane-label">Cues</div>
              <div
                v-for="block in cueBlocks"
                :key="block.cue.id"
                class="cue-block"
                :class="{ selected: timelineEditor.selectedCueId === block.cue.id }"
                :style="{ left: `${block.leftPx}px`, width: `${block.widthPx}px` }"
                @mousedown="startCueDrag($event, block.cue.id, 'move')"
              >
                <div class="cue-block-title">{{ block.cue.name }}</div>
                <div class="cue-block-meta">
                  {{ formatSmpte(block.inSec, fps) }}
                </div>
                <div
                  class="cue-resize-handle"
                  @mousedown.stop="startCueDrag($event, block.cue.id, 'resize')"
                />
              </div>
            </div>

            <div class="playhead" :style="{ left: `${playheadLeftPx}px` }" />
          </div>
        </div>
      </div>
    </div>

    <div class="timeline-control-panel sdmx-panel-footer">
      <div class="timeline-toolbar">
        <div class="cue-selection">
          <q-select
            :model-value="timelineEditor.selectedCueId"
            :options="timelineCueOptions"
            emit-value
            map-options
            label="Selected cue"
            dense
            class="cue-select"
            @update:model-value="timelineEditor.setSelectedCue"
          />
          <q-btn dense round color="primary" icon="add" @click="addTimelineCue">
            <q-tooltip>Add cue</q-tooltip>
          </q-btn>
        </div>

        <div class="playback-controls">
          <q-btn-group unelevated class="transport-btn-group">
            <q-btn
              icon="skip_previous"
              color="info"
              text-color="white"
              @click="timelineEditor.stop()"
            />
            <q-btn
              :icon="timelineEditor.isPlaying ? 'pause' : 'play_arrow'"
              :color="timelineEditor.isPlaying ? 'warning' : 'positive'"
              text-color="white"
              @click="timelineEditor.isPlaying ? timelineEditor.pause() : timelineEditor.play()"
            />
            <q-btn
              icon="stop"
              color="negative"
              text-color="white"
              @click="timelineEditor.stop(); timelineAudio.stopAudio()"
            />
          </q-btn-group>
        </div>

        <div class="progress-section">
          <div class="progress-info">
            <span class="cue-name">{{ selectedCue?.name ?? 'Set timeline' }}</span>
            <span class="progress-text">
              {{ playheadSmpte }} / {{ formatSmpte(msToSeconds(durationMs), fps) }}
            </span>
          </div>
          <q-linear-progress
            :value="playheadProgress"
            color="primary"
            track-color="grey-8"
            size="8px"
            class="progress-bar clickable"
            animation-speed="0"
            @click="handleProgressClick"
          />
        </div>

        <div class="timeline-options">
          <q-btn-toggle
            v-model="timelineEditor.syncMode"
            toggle-color="primary"
            dense
            unelevated
            :options="[
              { label: 'Free', value: 'free' },
              { label: 'Timecode', value: 'timecode' },
            ]"
          />
          <q-btn dense flat icon="upload_file" label="Import audio" @click="triggerAudioImport" />
          <q-btn dense flat icon="movie_edit" label="Edit cue" @click="openCueContentEditor" />
          <q-btn
            dense
            flat
            :icon="showAdvancedControls ? 'expand_less' : 'expand_more'"
            label="Advanced"
            @click="showAdvancedControls = !showAdvancedControls"
          />
          <q-btn
            v-if="!embedded"
            dense
            flat
            round
            icon="close"
            @click="closeEditor"
          >
            <q-tooltip>Close</q-tooltip>
          </q-btn>
        </div>
      </div>

      <q-slide-transition>
        <div v-show="showAdvancedControls" class="advanced-controls sdmx-advanced-panel">
          <div class="advanced-toolbar">
            <div v-if="selectedCue" class="cue-timing-controls">
              <span class="controls-label">Cue timing</span>
              <q-input
                v-model="selectedCue.name"
                label="Cue name"
                dense
                style="min-width: 140px"
                @blur="cueStore.updateCueModified"
              />
              <q-input
                v-model="selectedCueInSmpte"
                label="TC in"
                dense
                style="min-width: 150px"
              />
              <q-input
                v-model="selectedCueOutSmpte"
                label="TC out"
                dense
                style="min-width: 150px"
              />
            </div>

            <div class="sync-controls">
              <span class="controls-label">Timecode sync</span>
              <q-toggle v-model="timecodeStore.enabled" label="Enable show timecode" dense />
              <span class="sync-status">
                {{ timecodeStore.smpteLabel }} ({{ timecodeStore.source }})
              </span>
            </div>

            <div v-if="timelineAudio.primaryAsset" class="audio-controls">
              <span class="controls-label">Reference audio</span>
              <span class="audio-file-name">{{ timelineAudio.primaryAsset.fileName }}</span>
              <span class="audio-duration">
                {{ formatTimelineSeconds(timelineAudio.primaryAsset.durationMs / 1000) }}
              </span>
              <q-btn
                flat
                dense
                color="negative"
                icon="delete"
                label="Remove"
                @click="timelineAudio.removePrimaryAsset()"
              />
            </div>
          </div>
        </div>
      </q-slide-transition>
    </div>

    <input ref="fileInput" type="file" accept="audio/*" hidden @change="onAudioFilePicked" />
  </div>
</template>

<style scoped lang="scss">
.set-timeline-editor {
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--sdmx-color-bg-surface);
  color: var(--sdmx-color-text);
}

.editor-body {
  grid-row: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.timeline-panel {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.timeline-scroll {
  height: 100%;
  overflow: auto;
  background: var(--sdmx-color-bg-inset);
}

.timeline-canvas {
  position: relative;
  min-height: 280px;
}

.timeline-ruler {
  position: sticky;
  top: 0;
  z-index: 3;
  height: 42px;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-surface);
}

.ruler-marker {
  position: absolute;
  top: 0;
  height: 100%;
  border-left: 1px solid var(--sdmx-color-border-subtle);
  padding-left: 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  pointer-events: none;
}

.ruler-seconds {
  font-size: 11px;
  font-weight: 600;
}

.ruler-smpte {
  font-size: 10px;
  color: var(--sdmx-color-text-muted);
}

.timeline-lane {
  position: relative;
  min-height: 88px;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}

.lane-label {
  position: absolute;
  left: 8px;
  top: 8px;
  z-index: 2;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--sdmx-color-text-muted);
}

.audio-waveform {
  display: block;
  height: 72px;
  margin-top: 16px;
}

.lane-empty {
  position: absolute;
  inset: 24px 16px 8px 80px;
  display: flex;
  align-items: center;
  color: var(--sdmx-color-text-muted);
  font-size: 13px;
}

.cue-lane {
  min-height: 96px;
}

.cue-block {
  position: absolute;
  top: 28px;
  height: 52px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--sdmx-color-primary) 50%, var(--sdmx-color-border-subtle));
  background: color-mix(in srgb, var(--sdmx-color-primary) 18%, var(--sdmx-color-bg-surface));
  padding: 6px 10px;
  cursor: grab;
  overflow: hidden;

  &.selected {
    border-color: var(--sdmx-color-primary);
    box-shadow: 0 0 0 1px var(--sdmx-color-primary-ring);
  }
}

.cue-block-title {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cue-block-meta {
  font-size: 10px;
  color: var(--sdmx-color-text-muted);
}

.cue-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 100%;
  cursor: ew-resize;
  background: color-mix(in srgb, var(--sdmx-color-primary) 35%, transparent);
}

.playhead {
  position: absolute;
  top: 42px;
  bottom: 0;
  width: 2px;
  background: var(--sdmx-color-warning);
  z-index: 4;
  pointer-events: none;
}

.timeline-control-panel {
  grid-row: 2;
  flex-shrink: 0;
  min-width: 0;
  z-index: 2;
  background: var(--sdmx-color-bg-toolbar);
  max-height: 320px;
  overflow-y: auto;
  overflow-x: hidden;
}

.timeline-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 8px 12px;
  min-height: 48px;
  min-width: 0;

  .cue-selection {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 1 auto;
    min-width: 0;

    .cue-select {
      flex: 1 1 140px;
      min-width: 120px;
      max-width: 220px;
    }
  }

  .playback-controls {
    display: flex;
    align-items: center;
    flex-shrink: 0;

    :deep(.transport-btn-group) {
      .q-btn {
        position: relative;
        min-width: 40px;
        min-height: 36px;
        height: 36px;
        padding: 0 10px;
      }

      /* Later buttons overlap earlier ones in Quasar groups; keep each icon readable. */
      .q-btn:nth-child(1) {
        z-index: 3;
      }

      .q-btn:nth-child(2) {
        z-index: 2;
      }

      .q-btn:nth-child(3) {
        z-index: 1;
      }
    }
  }

  .progress-section {
    flex: 1 1 200px;
    min-width: 160px;

    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;

      .cue-name {
        font-weight: 600;
        color: var(--sdmx-color-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
      }

      .progress-text {
        font-size: 12px;
        color: var(--sdmx-color-text-muted);
        font-family: 'Courier New', monospace;
        flex-shrink: 0;
      }
    }

    .progress-bar {
      border-radius: 4px;

      &.clickable {
        cursor: pointer;
        transition: opacity 0.2s;

        &:hover {
          opacity: 0.8;
        }
      }
    }
  }

  .timeline-options {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-left: auto;
    flex-wrap: wrap;
  }
}

.advanced-toolbar {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 8px 12px;
  min-height: 44px;
  min-width: 0;

  .controls-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--sdmx-color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex: 0 0 100%;
  }

  .cue-timing-controls,
  .sync-controls,
  .audio-controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
  }

  .sync-status,
  .audio-file-name,
  .audio-duration {
    font-size: 12px;
    color: var(--sdmx-color-text-muted);
  }
}
</style>
