<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useCueStore } from 'src/stores/cue';
import { useUIStore } from 'src/stores/ui';
import { useInfoText } from 'src/composables/useInfoText';

const cueStore = useCueStore();
const ui = useUIStore();
const { info } = useInfoText();

const isPlaying = computed(() => {
  return cueStore.activeCue ? cueStore.playbackStates.has(cueStore.activeCue.id) : false;
});

const playbackProgress = computed(() => {
  if (!cueStore.activeCue) return 0;
  const duration = cueStore.totalDuration || 1000;
  return Math.min((cueStore.timelinePosition / duration) * 100, 100);
});

function togglePlayback() {
  if (!cueStore.activeCue) return;
  if (isPlaying.value) cueStore.pauseCue(cueStore.activeCue.id);
  else cueStore.playCue(cueStore.activeCue.id);
}

function stopPlayback() {
  if (!cueStore.activeCue) return;
  cueStore.stopCue(cueStore.activeCue.id);
  cueStore.setTimelinePosition(0);
}

function handleProgressClick(event: MouseEvent) {
  if (!cueStore.activeCue) return;
  const bar = event.currentTarget as HTMLElement;
  const rect = bar.getBoundingClientRect();
  const duration = cueStore.totalDuration || 1000;
  const newTime = ((event.clientX - rect.left) / rect.width) * duration;
  cueStore.setTimelinePosition(Math.max(0, Math.min(newTime, duration)));
}
</script>

<template>
  <div class="cue-bar row items-center q-px-md q-gutter-sm">
    <q-select
      v-info="'desk.cueBar.cueSelect'"
      v-model="cueStore.activeCueId"
      :options="(cueStore.cues || []).map((c) => ({ label: c.name, value: c.id }))"
      emit-value
      map-options
      label="Cue"
      dense
      style="min-width: 140px; max-width: 200px"
    />
    <q-btn-group unelevated dense>
      <q-btn
        v-info="'desk.cueBar.playPause'"
        :icon="isPlaying ? 'pause' : 'play_arrow'"
        :color="isPlaying ? 'warning' : 'positive'"
        :disable="!cueStore.activeCue"
        @click="togglePlayback"
      />
      <q-btn v-info="'desk.cueBar.stop'" icon="stop" color="negative" :disable="!cueStore.activeCue" @click="stopPlayback" />
      <q-btn v-info="'desk.cueBar.record'" icon="fiber_manual_record" color="red" :disable="!cueStore.activeCue" @click="cueStore.recordFrame()" />
    </q-btn-group>

    <div v-if="cueStore.activeCue" class="col-grow" style="min-width: 120px">
      <div class="row justify-between text-caption q-mb-xs">
        <span>{{ cueStore.activeCue.name }}</span>
        <span>{{ Math.round(cueStore.timelinePosition / 1000) }}s / {{ Math.round((cueStore.totalDuration || 1000) / 1000) }}s</span>
      </div>
      <q-linear-progress
        v-info="'desk.cueBar.timeline'"
        :value="playbackProgress / 100"
        color="primary"
        track-color="grey-8"
        size="6px"
        class="cursor-pointer"
        @click="handleProgressClick"
      />
    </div>

    <q-space />

    <q-btn
      v-info="'desk.cueBar.collapse'"
      dense
      flat
      :icon="ui.cueBarCollapsed ? 'expand_less' : 'expand_more'"
      @click="ui.cueBarCollapsed = !ui.cueBarCollapsed"
    />
  </div>
</template>

<style scoped>
.cue-bar {
  min-height: var(--sdmx-desk-cue-bar-height);
}
</style>
