<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { ProgrammerSession, TimelineClip, TimelineTrack } from '@softdmx/engine';
import { msToSeconds, secondsToMs } from '@softdmx/engine';
import { useTimelineEditorStore } from 'src/stores/timeline-editor';
import { useTimelineAudioStore } from 'src/stores/timeline-audio';
import { useTimecodeStore } from 'src/stores/timecode';
import SessionBakeDialog from './SessionBakeDialog.vue';
import TimelineTransportBar from './TimelineTransportBar.vue';
import TimelineRuler from './TimelineRuler.vue';
import TimelineTrackHeader from './TimelineTrackHeader.vue';
import TimelineTrackLane from './TimelineTrackLane.vue';
import TimelineInspector from './TimelineInspector.vue';

const HEADER_WIDTH = 140;
const LANE_HEIGHT = 72;
const AUDIO_HEIGHT = 64;
const RULER_HEIGHT = 44;

const timelineEditor = useTimelineEditorStore();
const timelineAudio = useTimelineAudioStore();
const timecodeStore = useTimecodeStore();

const scrollViewport = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const showBakeDialog = ref(false);
const bakeTargetSession = ref<ProgrammerSession | null>(null);
const suppressSeekUntil = ref(0);

const dragState = ref<{
  cueId: string;
  trackId: string;
  mode: 'move' | 'resize';
  startX: number;
  originInSec: number;
  originOutSec: number;
  selectedCueIds: string[];
  deltaSec: number;
  moved: boolean;
} | null>(null);

const marqueeState = ref<{
  startX: number;
  currentX: number;
  active: boolean;
  moved: boolean;
} | null>(null);

const pixelsPerSecond = computed(() => timelineEditor.pixelsPerSecond);
const durationMs = computed(() => timelineEditor.durationMs);
const timelineWidthPx = computed(() => (durationMs.value / 1000) * pixelsPerSecond.value);
const playheadLeftPx = computed(() => (timelineEditor.playheadMs / 1000) * pixelsPerSecond.value);

const audioTrack = computed<TimelineTrack>(() => ({
  id: 'timeline-audio-lane',
  name: 'Audio',
  kind: 'audio',
  order: -1,
  enabled: true,
  clips: [],
}));

const arrangementTracks = computed(() => {
  const tracks: TimelineTrack[] = [audioTrack.value, ...timelineEditor.cueTracks];
  if (timelineEditor.automationTrack) tracks.push(timelineEditor.automationTrack);
  else {
    tracks.push({
      id: 'timeline-automation-track',
      name: 'Sessions',
      kind: 'automation',
      order: 100,
      enabled: true,
      clips: timelineEditor.automationSessionClips,
    });
  }
  return tracks;
});

const displayTracks = computed(() => {
  if (!dragState.value) return arrangementTracks.value;
  const drag = dragState.value;
  return arrangementTracks.value.map((track) => {
    if (track.kind !== 'cue') return track;
    return {
      ...track,
      clips: track.clips.map((clip) => {
        if (!clip.cueId || !drag.selectedCueIds.includes(clip.cueId)) return clip;
        if (drag.mode === 'move') {
          return {
            ...clip,
            startSec: Math.max(0, clip.startSec + drag.deltaSec),
            endSec: Math.max(0.1, clip.endSec + drag.deltaSec),
          };
        }
        if (clip.cueId === drag.cueId) {
          return {
            ...clip,
            endSec: Math.max(clip.startSec + 0.1, clip.endSec + drag.deltaSec),
          };
        }
        return clip;
      }),
    };
  });
});

function onScroll() {
  if (!scrollViewport.value) return;
  timelineEditor.setScrollLeftPx(scrollViewport.value.scrollLeft);
}

function viewportXFromClient(clientX: number) {
  if (!scrollViewport.value) return 0;
  const rect = scrollViewport.value.getBoundingClientRect();
  return clientX - rect.left + scrollViewport.value.scrollLeft;
}

function addCueAtPlayhead() {
  const startSec = msToSeconds(timelineEditor.playheadMs);
  timelineEditor.createTimelineCue(
    `Cue ${timelineEditor.timelineCues.length + 1}`,
    startSec,
    startSec + 1
  );
}

function addTrack() {
  timelineEditor.addCueTrack();
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
}

function openBakeDialog() {
  const session = timelineEditor.programmerSessions[0];
  if (!session) return;
  bakeTargetSession.value = session;
  showBakeDialog.value = true;
}

function onClipPointerDown(
  event: MouseEvent,
  payload: { clip: TimelineClip; mode: 'move' | 'resize'; trackId: string }
) {
  event.preventDefault();
  event.stopPropagation();
  if (payload.clip.cueId) {
    if (event.metaKey || event.ctrlKey) {
      timelineEditor.toggleCueSelection(payload.clip.cueId);
    } else if (!timelineEditor.selectedCueIds.includes(payload.clip.cueId)) {
      timelineEditor.setSelectedCue(payload.clip.cueId);
    } else {
      timelineEditor.setSelectedCue(payload.clip.cueId);
    }
  }

  if (payload.trackId.includes('automation') || payload.clip.id.startsWith('session-clip-')) {
    const sessionId = timelineEditor.parseSessionIdFromClip(payload.clip.id);
    if (sessionId) {
      const session = timelineEditor.programmerSessions.find((entry) => entry.id === sessionId);
      if (session) {
        bakeTargetSession.value = session;
        showBakeDialog.value = true;
      }
    }
    return;
  }

  if (!payload.clip.cueId) return;

  dragState.value = {
    cueId: payload.clip.cueId,
    trackId: payload.trackId,
    mode: payload.mode,
    startX: event.clientX,
    originInSec: payload.clip.startSec,
    originOutSec: payload.clip.endSec,
    selectedCueIds:
      payload.mode === 'move' ? [...timelineEditor.selectedCueIds] : [payload.clip.cueId],
    deltaSec: 0,
    moved: false,
  };
}

function onClipClick(event: MouseEvent, clip: TimelineClip) {
  event.stopPropagation();
  if (clip.cueId) timelineEditor.setSelectedCue(clip.cueId);
}

function onLanePointerDown(event: MouseEvent) {
  if (event.button !== 0) return;
  if ((event.target as HTMLElement).closest('.timeline-clip')) return;
  const x = viewportXFromClient(event.clientX);
  marqueeState.value = {
    startX: x,
    currentX: x,
    active: true,
    moved: false,
  };
}

function onPointerMove(event: MouseEvent) {
  if (dragState.value) {
    const rawDelta = (event.clientX - dragState.value.startX) / pixelsPerSecond.value;
    if (Math.abs(rawDelta) > 0.01) dragState.value.moved = true;
    const previewIn = timelineEditor.snapPreviewSeconds(
      Math.max(0, dragState.value.originInSec + rawDelta)
    );
    dragState.value.deltaSec = previewIn - dragState.value.originInSec;
    return;
  }
  if (marqueeState.value?.active) {
    marqueeState.value.currentX = viewportXFromClient(event.clientX);
    if (Math.abs(marqueeState.value.currentX - marqueeState.value.startX) > 4) {
      marqueeState.value.moved = true;
    }
  }
}

function onPointerUp() {
  if (dragState.value) {
    const { mode, cueId, deltaSec, originOutSec, selectedCueIds, moved, trackId } = dragState.value;
    if (moved) {
      suppressSeekUntil.value = performance.now() + 250;
      if (mode === 'move') {
        for (const id of selectedCueIds) {
          const cue = timelineEditor.timelineCues.find((entry) => entry.id === id);
          const clip = timelineEditor.timelineTracks
            .flatMap((track) => track.clips)
            .find((entry) => entry.cueId === id);
          const base = clip?.startSec ?? cue?.timecodeIn ?? 0;
          timelineEditor.assignCueTimecodeIn(id, base + deltaSec, trackId);
        }
      } else {
        timelineEditor.assignCueTimecodeOut(cueId, originOutSec + deltaSec, trackId);
      }
    }
    dragState.value = null;
  }

  if (marqueeState.value?.active) {
    if (marqueeState.value.moved) {
      suppressSeekUntil.value = performance.now() + 250;
      const start = Math.min(marqueeState.value.startX, marqueeState.value.currentX);
      const end = Math.max(marqueeState.value.startX, marqueeState.value.currentX);
      const ids: string[] = [];
      for (const track of timelineEditor.cueTracks) {
        for (const clip of track.clips) {
          if (!clip.cueId) continue;
          const left = clip.startSec * pixelsPerSecond.value;
          const right = clip.endSec * pixelsPerSecond.value;
          if (left <= end && right >= start) ids.push(clip.cueId);
        }
      }
      timelineEditor.setSelectedCues(ids, ids[0] ?? null);
    } else if (performance.now() > suppressSeekUntil.value) {
      const sec = marqueeState.value.startX / pixelsPerSecond.value;
      timelineEditor.seekToMs(secondsToMs(sec));
      timelineEditor.setSelectedCues([], null);
    }
    marqueeState.value = null;
  }
}

function onWheelZoom(event: WheelEvent) {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  if (!scrollViewport.value) return;

  const rect = scrollViewport.value.getBoundingClientRect();
  const cursorX = event.clientX - rect.left + scrollViewport.value.scrollLeft;
  const timeSec = cursorX / pixelsPerSecond.value;
  const factor = event.deltaY < 0 ? 1.08 : 0.92;
  const nextPps = Math.max(24, Math.min(480, pixelsPerSecond.value * factor));
  timelineEditor.pixelsPerSecond = nextPps;
  requestAnimationFrame(() => {
    if (!scrollViewport.value) return;
    const nextScroll = Math.max(0, timeSec * nextPps - (event.clientX - rect.left));
    scrollViewport.value.scrollLeft = nextScroll;
    timelineEditor.setScrollLeftPx(nextScroll);
  });
}

function onEditorKeydown(event: KeyboardEvent) {
  if ((event.target as HTMLElement)?.closest('input,textarea,[contenteditable="true"]')) return;
  const snapStep = Math.max(0.1, timelineEditor.timelineConfig?.snapStep ?? 1);
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    for (const id of timelineEditor.selectedCueIds) {
      const cue = timelineEditor.timelineCues.find((entry) => entry.id === id);
      timelineEditor.assignCueTimecodeIn(id, (cue?.timecodeIn ?? 0) - snapStep);
    }
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    for (const id of timelineEditor.selectedCueIds) {
      const cue = timelineEditor.timelineCues.find((entry) => entry.id === id);
      timelineEditor.assignCueTimecodeIn(id, (cue?.timecodeIn ?? 0) + snapStep);
    }
  } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    timelineEditor.duplicateSelectedClips();
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    timelineEditor.deleteSelectedClips();
  } else if (event.key === ' ') {
    event.preventDefault();
    if (timelineEditor.isPlaying) timelineEditor.pause();
    else timelineEditor.play();
  }
}

watch(
  () => [timelineEditor.playheadMs, timelineEditor.followPlayhead, timelineEditor.isPlaying, pixelsPerSecond.value],
  () => {
    if (!timelineEditor.followPlayhead || !timelineEditor.isPlaying || !scrollViewport.value) return;
    const viewLeft = scrollViewport.value.scrollLeft;
    const viewRight = viewLeft + scrollViewport.value.clientWidth;
    const playheadX = playheadLeftPx.value;
    if (playheadX < viewLeft + 40 || playheadX > viewRight - 80) {
      scrollViewport.value.scrollLeft = Math.max(0, playheadX - scrollViewport.value.clientWidth * 0.35);
      timelineEditor.setScrollLeftPx(scrollViewport.value.scrollLeft);
    }
  }
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
  if (timelineEditor.timelineCues.length === 0 && timelineEditor.cueTracks.every((t) => t.clips.length === 0)) {
    timelineEditor.ensureTimelineCue('Main Set');
  }
  void timelineAudio.prepareAudioElement();
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  window.addEventListener('keydown', onEditorKeydown);
});

onUnmounted(() => {
  timelineEditor.stopPlaybackLoop();
  timelineEditor.setPreviewEnabled(false);
  timelineAudio.disposeAudioElement();
  window.removeEventListener('mousemove', onPointerMove);
  window.removeEventListener('mouseup', onPointerUp);
  window.removeEventListener('keydown', onEditorKeydown);
});
</script>

<template>
  <div
    class="timeline-arrangement"
    tabindex="0"
  >
    <TimelineTransportBar
      @import-audio="triggerAudioImport"
      @add-cue="addCueAtPlayhead"
      @add-track="addTrack"
      @bake-session="openBakeDialog"
    />

    <div class="timeline-arrangement__body">
      <div class="timeline-arrangement__workspace">
        <div
          class="timeline-arrangement__headers"
          :style="{ width: `${HEADER_WIDTH}px` }"
        >
          <div
            class="timeline-arrangement__ruler-spacer"
            :style="{ height: `${RULER_HEIGHT}px` }"
          />
          <div
            v-for="track in displayTracks"
            :key="`header-${track.id}`"
            :style="{ height: `${track.kind === 'audio' ? AUDIO_HEIGHT : LANE_HEIGHT}px` }"
          >
            <TimelineTrackHeader :track="track" />
          </div>
        </div>

        <div
          ref="scrollViewport"
          class="timeline-arrangement__scroll"
          @scroll="onScroll"
          @wheel="onWheelZoom"
        >
          <div
            class="timeline-arrangement__canvas"
            :style="{ width: `${timelineWidthPx}px` }"
          >
            <TimelineRuler :width-px="timelineWidthPx" />
            <TimelineTrackLane
              v-for="track in displayTracks"
              :key="track.id"
              :track="track"
              :width-px="timelineWidthPx"
              :height="track.kind === 'audio' ? AUDIO_HEIGHT : LANE_HEIGHT"
              @clip-pointer-down="onClipPointerDown"
              @clip-click="onClipClick"
              @lane-pointer-down="onLanePointerDown"
            />

            <div
              class="timeline-arrangement__playhead"
              :style="{ left: `${playheadLeftPx}px` }"
            />
            <div
              v-if="marqueeState?.active && marqueeState.moved"
              class="timeline-arrangement__marquee"
              :style="{
                left: `${Math.min(marqueeState.startX, marqueeState.currentX)}px`,
                width: `${Math.abs(marqueeState.currentX - marqueeState.startX)}px`,
              }"
            />
          </div>
        </div>
      </div>

      <TimelineInspector />
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="audio/*"
      hidden
      @change="onAudioFilePicked"
    />

    <SessionBakeDialog
      v-if="bakeTargetSession"
      v-model="showBakeDialog"
      :session="bakeTargetSession"
    />
  </div>
</template>

<style scoped>
.timeline-arrangement {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--sdmx-color-bg-surface);
  color: var(--sdmx-color-text);
  outline: none;
}

.timeline-arrangement__body {
  display: flex;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

.timeline-arrangement__workspace {
  display: flex;
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.timeline-arrangement__headers {
  flex-shrink: 0;
  border-right: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-elevated);
  z-index: 2;
}

.timeline-arrangement__ruler-spacer {
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  background: color-mix(in srgb, var(--sdmx-color-bg-surface) 92%, transparent);
}

.timeline-arrangement__scroll {
  flex: 1 1 0;
  min-width: 0;
  overflow: auto;
}

.timeline-arrangement__canvas {
  position: relative;
  min-height: 100%;
}

.timeline-arrangement__playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--sdmx-color-scratch, #ff3b30);
  pointer-events: none;
  z-index: 8;
}

.timeline-arrangement__marquee {
  position: absolute;
  top: 44px;
  bottom: 0;
  border: 1px dashed var(--sdmx-color-primary);
  background: color-mix(in srgb, var(--sdmx-color-primary) 15%, transparent);
  pointer-events: none;
  z-index: 5;
}
</style>
