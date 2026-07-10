<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  formatSmpte,
  formatTimelineSeconds,
  getCueTimecodeInSeconds,
  getCueTimecodeOutSeconds,
  parseSmpteInput,
} from '@softdmx/engine';
import { useCueStore } from 'src/stores/cue';
import { useShowStore } from 'src/stores/show';
import { useTimelineEditorStore } from 'src/stores/timeline-editor';
import { useTimecodeStore } from 'src/stores/timecode';
import { useUIStore } from 'src/stores/ui';

const cueStore = useCueStore();
const showStore = useShowStore();
const timelineEditor = useTimelineEditorStore();
const timecodeStore = useTimecodeStore();
const ui = useUIStore();

const markerName = ref('Marker');
const sectionName = ref('Section');

const inspectorCue = computed(() =>
  showStore.document.cues.find((cue) => cue.id === timelineEditor.selectedCueId) ?? null
);

const inspectorClip = computed(() => {
  const cueId = inspectorCue.value?.id;
  if (!cueId) return null;
  for (const track of timelineEditor.timelineTracks) {
    const clip = track.clips.find((entry) => entry.cueId === cueId);
    if (clip) return { track, clip };
  }
  return null;
});

const fps = computed(() => timelineEditor.fps);

const selectedCueInSmpte = computed({
  get: () => {
    if (!inspectorCue.value) return '00:00:00:00';
    return formatSmpte(getCueTimecodeInSeconds(inspectorCue.value) ?? 0, fps.value);
  },
  set: (value: string) => {
    if (!inspectorCue.value) return;
    const parsed = parseSmpteInput(value, fps.value);
    if (parsed === null) return;
    timelineEditor.assignCueTimecodeIn(inspectorCue.value.id, parsed);
  },
});

const selectedCueOutSmpte = computed({
  get: () => {
    if (!inspectorCue.value) return '00:00:00:00';
    return formatSmpte(getCueTimecodeOutSeconds(inspectorCue.value) ?? 0, fps.value);
  },
  set: (value: string) => {
    if (!inspectorCue.value) return;
    const parsed = parseSmpteInput(value, fps.value);
    if (parsed === null) return;
    timelineEditor.assignCueTimecodeOut(inspectorCue.value.id, parsed);
  },
});

const snapModeOptions = [
  { label: 'Seconds', value: 'seconds' },
  { label: 'Frames', value: 'frames' },
  { label: 'Beats', value: 'beats' },
];

function updateSnap<K extends 'snapEnabled' | 'snapMode' | 'snapStep' | 'snapToMarkers' | 'snapToAudioTransients'>(
  key: K,
  value: NonNullable<NonNullable<typeof timelineEditor.timelineConfig>[K]>
) {
  showStore.updateDocument((doc) => {
    doc.timeline = doc.timeline ?? {};
    (doc.timeline as Record<string, unknown>)[key] = value;
  });
}

function openCueEditor() {
  if (!inspectorCue.value) {
    const id = timelineEditor.createTimelineCue('Set Cue', 0, 1);
    cueStore.activeCueId = id;
  } else {
    cueStore.activeCueId = inspectorCue.value.id;
  }
  ui.openDialog('cueEditor');
}

function addMarkerAtPlayhead() {
  timelineEditor.addMarker(markerName.value || 'Marker', timelineEditor.playheadMs / 1000);
}

function addSectionFromSelection() {
  const selected = timelineEditor.timelineCues.filter((cue) =>
    timelineEditor.selectedCueIds.includes(cue.id)
  );
  if (selected.length === 0) return;
  const start = Math.min(...selected.map((cue) => getCueTimecodeInSeconds(cue) ?? 0));
  const end = Math.max(
    ...selected.map((cue) => getCueTimecodeOutSeconds(cue) ?? (getCueTimecodeInSeconds(cue) ?? 0) + 1)
  );
  timelineEditor.addSection(sectionName.value || 'Section', start, end);
}
</script>

<template>
  <aside class="timeline-inspector">
    <div class="timeline-inspector__title">Inspector</div>

    <div
      v-if="inspectorCue"
      class="timeline-inspector__group"
    >
      <div class="timeline-inspector__label">Cue</div>
      <XInput
        v-model="inspectorCue.name"
        dense
        label="Name"
        @blur="cueStore.updateCueModified"
      />
      <XInput
        v-model="selectedCueInSmpte"
        dense
        label="TC in"
      />
      <XInput
        v-model="selectedCueOutSmpte"
        dense
        label="TC out"
      />
      <div
        v-if="inspectorClip"
        class="timeline-inspector__meta"
      >
        Track: {{ inspectorClip.track.name }}
      </div>
      <XButton
        flat
        size="sm"
        icon="movie"
        label="Edit cue"
        @click="openCueEditor"
      />
      <XButton
        flat
        size="sm"
        icon="copy"
        label="Duplicate"
        @click="timelineEditor.duplicateSelectedClips()"
      />
      <XButton
        flat
        size="sm"
        color="danger"
        icon="trash"
        label="Remove from timeline"
        @click="timelineEditor.deleteSelectedClips()"
      />
    </div>
    <div
      v-else
      class="timeline-inspector__empty"
    >
      Select a clip to inspect timing and metadata.
    </div>

    <div class="timeline-inspector__group">
      <div class="timeline-inspector__label">Snap</div>
      <XSwitch
        :model-value="timelineEditor.timelineConfig?.snapEnabled ?? true"
        label="Enabled"
        @update:model-value="(value) => updateSnap('snapEnabled', Boolean(value))"
      />
      <XSelect
        :model-value="timelineEditor.timelineConfig?.snapMode ?? 'seconds'"
        :options="snapModeOptions"
        dense
        label="Mode"
        @update:model-value="(value) => updateSnap('snapMode', value as 'seconds' | 'frames' | 'beats')"
      />
      <XInput
        :model-value="timelineEditor.timelineConfig?.snapStep ?? 1"
        type="number"
        dense
        label="Step"
        @update:model-value="(value) => updateSnap('snapStep', Number(value) || 1)"
      />
      <XSwitch
        :model-value="timelineEditor.timelineConfig?.snapToMarkers ?? false"
        label="To markers"
        @update:model-value="(value) => updateSnap('snapToMarkers', Boolean(value))"
      />
      <XSwitch
        :model-value="timelineEditor.timelineConfig?.snapToAudioTransients ?? false"
        label="To audio transients"
        @update:model-value="(value) => updateSnap('snapToAudioTransients', Boolean(value))"
      />
    </div>

    <div class="timeline-inspector__group">
      <div class="timeline-inspector__label">Timecode</div>
      <XSwitch
        v-model="timecodeStore.enabled"
        label="Enable show timecode"
      />
      <div class="timeline-inspector__meta">
        {{ timecodeStore.smpteLabel }} ({{ timecodeStore.source }})
      </div>
    </div>

    <div class="timeline-inspector__group">
      <div class="timeline-inspector__label">Markers</div>
      <XInput
        v-model="markerName"
        dense
        label="Marker name"
      />
      <XButton
        flat
        size="sm"
        icon="bookmark-plus"
        label="Add at playhead"
        @click="addMarkerAtPlayhead"
      />
      <div class="timeline-inspector__list">
        <div
          v-for="marker in timelineEditor.markers"
          :key="marker.id"
          class="timeline-inspector__row"
        >
          <span>{{ marker.name }}</span>
          <span>{{ formatTimelineSeconds(marker.timeSec) }}</span>
        </div>
      </div>
    </div>

    <div class="timeline-inspector__group">
      <div class="timeline-inspector__label">Sections</div>
      <XInput
        v-model="sectionName"
        dense
        label="Section name"
      />
      <XButton
        flat
        size="sm"
        icon="rectangle"
        label="Add from selection"
        @click="addSectionFromSelection"
      />
      <div class="timeline-inspector__list">
        <div
          v-for="section in timelineEditor.sections"
          :key="section.id"
          class="timeline-inspector__row"
        >
          <span>{{ section.name }}</span>
          <span>
            {{ formatTimelineSeconds(section.startSec) }} -
            {{ formatTimelineSeconds(section.endSec) }}
          </span>
        </div>
      </div>
    </div>

    <div class="timeline-inspector__group">
      <div class="timeline-inspector__label">Diagnostics</div>
      <div
        v-if="timelineEditor.conflictDiagnostics.length === 0"
        class="timeline-inspector__empty"
      >
        No overlaps detected.
      </div>
      <div
        v-else
        class="timeline-inspector__list"
      >
        <div
          v-for="(conflict, index) in timelineEditor.conflictDiagnostics"
          :key="`${conflict.trackId}-${index}`"
          class="timeline-inspector__row timeline-inspector__row--warning"
        >
          <span>{{ conflict.trackName }}</span>
          <span>
            {{ formatTimelineSeconds(conflict.overlapStartSec) }} -
            {{ formatTimelineSeconds(conflict.overlapEndSec) }}
          </span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.timeline-inspector {
  width: 280px;
  min-width: 240px;
  max-width: 320px;
  overflow: auto;
  padding: 12px;
  border-left: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-surface);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline-inspector__title {
  font-size: var(--sdmx-font-size-title);
  font-weight: var(--sdmx-font-weight-bold);
}

.timeline-inspector__group {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  background: color-mix(in srgb, var(--sdmx-color-bg-surface) 65%, transparent);
}

.timeline-inspector__label {
  font-size: 11px;
  color: var(--sdmx-color-text-faint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.timeline-inspector__empty,
.timeline-inspector__meta {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
}

.timeline-inspector__list {
  display: grid;
  gap: 4px;
  max-height: 120px;
  overflow: auto;
}

.timeline-inspector__row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: var(--sdmx-color-text-muted);
}

.timeline-inspector__row--warning {
  color: var(--sdmx-color-warning);
}
</style>
