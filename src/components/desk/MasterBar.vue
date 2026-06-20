<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useShowStore } from 'src/stores/show';
import { useOutputEngineStore } from 'src/stores/output-engine';
import { useScratchStore } from 'src/stores/scratch';
import { useLinkStore } from 'src/stores/link';
import { useAudioStore } from 'src/stores/audio';
import { useTimecodeStore } from 'src/stores/timecode';
import { useUIStore } from 'src/stores/ui';
import {
  QUICK_ACCESS_WORKSPACE_MODES,
  WORKSPACE_MODE_META,
} from 'src/utils/workspace-modes';
import ViewSwitcher from './ViewSwitcher.vue';
import GmFader from './GmFader.vue';

const ui = useUIStore();
const showStore = useShowStore();
const engine = useOutputEngineStore();
const scratch = useScratchStore();
const linkStore = useLinkStore();
const audioStore = useAudioStore();
const timecodeStore = useTimecodeStore();

const grandMaster = computed({
  get: () => engine.grandMaster,
  set: (value: number) => engine.setGrandMaster(value),
});

const playbackBus = computed({
  get: () => engine.playbackBusMaster,
  set: (value: number) => engine.setPlaybackBusMaster(value),
});

const timecodeActive = computed(() => showStore.document.timecode?.enabled === true);
const timecodeLocked = computed(() => {
  if (!timecodeActive.value || timecodeStore.lastUpdatedAtMs === null) return false;
  return performance.now() - timecodeStore.lastUpdatedAtMs < 1500;
});

function toggleBlackout() {
  engine.setBlackout(!engine.blackout);
}

function toggleBlind() {
  scratch.toggleBlind();
  engine.requestMerge();
}
</script>

<template>
  <div class="master-bar row items-center q-px-sm q-gutter-x-xs">
    <q-btn flat dense round icon="menu" aria-label="Menu" @click="ui.toggleLeftDrawer(true)" />

    <q-btn
      v-for="mode in QUICK_ACCESS_WORKSPACE_MODES"
      :key="mode"
      round
      dense
      flat
      :icon="WORKSPACE_MODE_META[mode].icon"
      :color="ui.mode === mode ? 'primary' : 'grey-5'"
      @click="ui.setMode(mode)"
    >
      <q-tooltip>{{ WORKSPACE_MODE_META[mode].label }}</q-tooltip>
    </q-btn>

    <ViewSwitcher v-if="ui.isLive" />

    <q-btn
      v-if="ui.isLive"
      dense
      flat
      :icon="ui.operateLocked ? 'lock' : 'lock_open'"
      :color="ui.operateLocked ? 'grey-6' : 'warning'"
      @click="ui.toggleOperateLock()"
    >
      <q-tooltip>{{ ui.operateLocked ? 'Operate locked' : 'Edit mode unlocked' }}</q-tooltip>
    </q-btn>

    <q-space />

    <GmFader v-model="grandMaster" label="GM" color="orange" />
    <GmFader v-model="playbackBus" label="PB" color="deep-purple" />

    <q-btn
      dense
      :color="engine.blackout ? 'negative' : 'grey-8'"
      :label="engine.blackout ? 'BO' : 'Blackout'"
      @click="toggleBlackout"
    />
    <q-btn
      dense
      :color="scratch.blindMode ? 'warning' : 'grey-8'"
      :label="scratch.blindMode ? 'Blind' : 'Live'"
      @click="toggleBlind"
    />

    <q-chip dense color="grey-9" text-color="white" icon="description" class="status-chip">
      {{ showStore.name }}
      <q-icon v-if="showStore.isDirty" name="fiber_manual_record" color="warning" size="12px" class="q-ml-xs" />
    </q-chip>
    <q-chip dense :color="linkStore.numPeers > 0 ? 'positive' : 'grey-8'" text-color="white" icon="link">
      {{ linkStore.numPeers }}
    </q-chip>
    <q-chip
      v-if="timecodeActive"
      dense
      :color="timecodeLocked ? 'teal' : 'grey-8'"
      text-color="white"
      icon="schedule"
    >
      {{ timecodeStore.smpteLabel }}
    </q-chip>
    <q-chip v-if="audioStore.enabled" dense color="deep-purple" text-color="white" icon="graphic_eq">
      Audio
    </q-chip>
  </div>
</template>

<style scoped>
.status-chip {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
