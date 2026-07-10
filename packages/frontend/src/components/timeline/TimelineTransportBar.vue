<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { formatSmpte, msToSeconds } from '@softdmx/engine';
import { useTimelineEditorStore } from 'src/stores/timeline-editor';
import { useTimelineAudioStore } from 'src/stores/timeline-audio';
import { useProgrammerSessionStore } from 'src/stores/programmer-session';
import { useTimecodeStore } from 'src/stores/timecode';

const emit = defineEmits<{
  'import-audio': [];
  'add-cue': [];
  'add-track': [];
  'bake-session': [];
}>();

const timelineEditor = useTimelineEditorStore();
const timelineAudio = useTimelineAudioStore();
const sessionStore = useProgrammerSessionStore();
const timecodeStore = useTimecodeStore();

const playheadSmpte = computed(() =>
  formatSmpte(msToSeconds(timelineEditor.playheadMs), timelineEditor.fps)
);
const durationSmpte = computed(() =>
  formatSmpte(msToSeconds(timelineEditor.durationMs), timelineEditor.fps)
);

const sessionOptions = computed(() =>
  timelineEditor.programmerSessions.map((session) => ({
    label: session.name,
    value: session.id,
  }))
);

function togglePlay() {
  if (timelineEditor.isPlaying) timelineEditor.pause();
  else timelineEditor.play();
}

function toggleRecord() {
  if (sessionStore.armed) sessionStore.disarm();
  else sessionStore.arm({ clock: 'set-playhead' });
}
</script>

<template>
  <div class="timeline-transport">
    <div class="timeline-transport__left">
      <XButtonGroup size="sm">
        <XButton
          flat
          icon="player-skip-back"
          @click="timelineEditor.returnToStart()"
        />
        <XButton
          flat
          :icon="timelineEditor.isPlaying ? 'player-pause-filled' : 'player-play-filled'"
          @click="togglePlay"
        />
        <XButton
          flat
          icon="square"
          @click="timelineEditor.stop()"
        />
      </XButtonGroup>
      <div class="timeline-transport__time sdmx-text-mono">
        {{ playheadSmpte }} / {{ durationSmpte }}
      </div>
      <XButtonGroup size="sm">
        <XButton
          :color="timelineEditor.syncMode === 'free' ? 'primary' : 'default'"
          label="Free"
          @click="timelineEditor.syncMode = 'free'"
        />
        <XButton
          :color="timelineEditor.syncMode === 'timecode' ? 'primary' : 'default'"
          label="TC"
          @click="timelineEditor.syncMode = 'timecode'"
        />
      </XButtonGroup>
      <span
        v-if="timelineEditor.syncMode === 'timecode'"
        class="timeline-transport__tc"
      >
        {{ timecodeStore.smpteLabel }}
      </span>
    </div>

    <div class="timeline-transport__center">
      <XButton
        flat
        size="sm"
        icon="zoom-out"
        @click="timelineEditor.pixelsPerSecond = Math.max(24, timelineEditor.pixelsPerSecond - 12)"
      />
      <div class="timeline-transport__zoom">
        <XSlider
          :model-value="timelineEditor.pixelsPerSecond"
          :min="24"
          :max="480"
          :step="4"
          @update:model-value="(value) => (timelineEditor.pixelsPerSecond = Number(value))"
        />
      </div>
      <XButton
        flat
        size="sm"
        icon="zoom-in"
        @click="timelineEditor.pixelsPerSecond = Math.min(480, timelineEditor.pixelsPerSecond + 12)"
      />
      <XSwitch
        v-model="timelineEditor.followPlayhead"
        label="Follow"
      />
    </div>

    <div class="timeline-transport__right">
      <XButton
        flat
        size="sm"
        icon="file-upload"
        label="Audio"
        @click="emit('import-audio')"
      />
      <XButton
        flat
        size="sm"
        icon="plus"
        label="Cue"
        @click="emit('add-cue')"
      />
      <XButton
        flat
        size="sm"
        icon="plus"
        label="Track"
        @click="emit('add-track')"
      />
      <XButton
        size="sm"
        :color="sessionStore.armed ? 'danger' : 'primary'"
        :icon="sessionStore.armed ? 'player-stop-filled' : 'player-record-filled'"
        :label="sessionStore.armed ? 'Stop rec' : 'Record'"
        @click="toggleRecord"
      />
      <XButton
        v-if="sessionOptions.length > 0"
        flat
        size="sm"
        icon="cookie"
        label="Bake"
        @click="emit('bake-session')"
      />
      <XButton
        v-if="timelineAudio.primaryAsset"
        flat
        size="sm"
        color="danger"
        icon="trash"
        @click="timelineAudio.removePrimaryAsset()"
      />
    </div>
  </div>
</template>

<style scoped>
.timeline-transport {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 12px;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-toolbar);
}

.timeline-transport__left,
.timeline-transport__center,
.timeline-transport__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.timeline-transport__center {
  flex: 1 1 auto;
  justify-content: center;
}

.timeline-transport__right {
  margin-left: auto;
}

.timeline-transport__time {
  font-size: 12px;
  color: var(--sdmx-color-text);
  min-width: 160px;
}

.timeline-transport__tc {
  font-size: 11px;
  color: var(--sdmx-color-text-muted);
}

.timeline-transport__zoom {
  width: 120px;
}
</style>
