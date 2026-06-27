<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useShowStore } from 'src/stores/show';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useScratchStore } from 'src/stores/scratch';
import { useLinkStore } from 'src/stores/link';
import { useAudioStore } from 'src/stores/audio';
import { useTimecodeStore } from 'src/stores/timecode';
import { useUIStore } from 'src/stores/ui';
import {
  QUICK_ACCESS_WORKSPACE_MODES,
  WORKSPACE_MODE_META,
} from 'src/desk/workspace-modes';
import { SdmxButton, SdmxStatusChip } from 'src/components/ui';
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
    <SdmxButton
      icon="menu"
      round
      variant="ghost"
      info="Open navigation menu"
      @click="ui.toggleLeftDrawer(true)"
    />

    <SdmxButton
      v-for="mode in QUICK_ACCESS_WORKSPACE_MODES"
      :key="mode"
      :icon="WORKSPACE_MODE_META[mode].icon"
      round
      :variant="ui.mode === mode ? 'primary' : 'ghost'"
      :active="ui.mode === mode"
      :info="WORKSPACE_MODE_META[mode].label"
      @click="ui.setMode(mode)"
    />

    <ViewSwitcher v-if="ui.isLive" />

    <SdmxButton
      v-if="ui.isLive"
      :icon="ui.operateLocked ? 'lock' : 'lock_open'"
      :variant="ui.operateLocked ? 'ghost' : 'warning'"
      :info="ui.operateLocked ? 'Operate locked' : 'Edit mode unlocked'"
      @click="ui.toggleOperateLock()"
    />

    <SdmxButton
      icon="help_outline"
      round
      :variant="ui.infoMode ? 'primary' : 'ghost'"
      :active="ui.infoMode"
      info="Toggle info mode — hover elements to learn their function"
      @click="ui.toggleInfoMode()"
    />
    <SdmxButton
      icon="terminal"
      round
      :variant="ui.commandLineOpen ? 'primary' : 'ghost'"
      :active="ui.commandLineOpen"
      info="Open command line (Ctrl+K or `)"
      @click="ui.toggleCommandLine()"
    />
    <SdmxButton
      v-if="ui.isLive"
      :icon="ui.cueBarCollapsed ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
      round
      :variant="ui.cueBarCollapsed ? 'warning' : 'ghost'"
      :active="!ui.cueBarCollapsed"
      :info="ui.cueBarCollapsed ? 'Show transport controls' : 'Hide transport controls'"
      @click="ui.cueBarCollapsed = !ui.cueBarCollapsed"
    />

    <q-space />

    <GmFader v-model="grandMaster" label="GM" color="orange" info="Grand Master — scales all output levels" />
    <GmFader v-model="playbackBus" label="PB" color="deep-purple" info="Playback Bus Master" />

    <SdmxButton
      :label="engine.blackout ? 'BO' : 'Blackout'"
      :variant="engine.blackout ? 'danger' : 'default'"
      :active="engine.blackout"
      info="Toggle blackout — kills all output"
      @click="toggleBlackout"
    />
    <SdmxButton
      :label="scratch.blindMode ? 'Blind' : 'Live'"
      :variant="scratch.blindMode ? 'warning' : 'default'"
      :active="scratch.blindMode"
      info="Toggle blind/preview mode"
      @click="toggleBlind"
    />

    <SdmxStatusChip
      :label="showStore.name"
      icon="description"
      :variant="showStore.isDirty ? 'warning' : 'default'"
      info="Current show file"
    />
    <SdmxStatusChip
      :label="String(linkStore.numPeers)"
      icon="link"
      :variant="linkStore.numPeers > 0 ? 'positive' : 'default'"
      info="Ableton Link peers"
    />
    <SdmxStatusChip
      v-if="timecodeActive"
      :label="timecodeStore.smpteLabel"
      icon="schedule"
      :variant="timecodeLocked ? 'active' : 'default'"
      info="Timecode status"
    />
    <SdmxStatusChip
      v-if="audioStore.enabled"
      label="Audio"
      icon="graphic_eq"
      variant="info"
      info="Audio reactive mode active"
    />
  </div>
</template>
