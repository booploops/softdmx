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
import { useInfoText } from 'src/composables/useInfoText';
import ViewSwitcher from './ViewSwitcher.vue';
import GmFader from './GmFader.vue';

const ui = useUIStore();
const showStore = useShowStore();
const engine = useOutputEngineStore();
const scratch = useScratchStore();
const linkStore = useLinkStore();
const audioStore = useAudioStore();
const timecodeStore = useTimecodeStore();
const { info } = useInfoText();

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

function onGrandMasterCommit(value: number) {
  engine.setGrandMaster(value, { flush: true });
}

function onPlaybackBusCommit(value: number) {
  engine.setPlaybackBusMaster(value, { flush: true });
}
</script>

<template>
  <div class="master-bar row items-center q-px-sm q-gutter-x-xs">
    <SdmxButton
      icon="menu"
      round
      variant="ghost"
      :info="info('desk.masterBar.menu')"
      @click="ui.toggleLeftDrawer(true)"
    />

    <SdmxButton
      v-for="mode in QUICK_ACCESS_WORKSPACE_MODES"
      :key="mode"
      :icon="WORKSPACE_MODE_META[mode].icon"
      round
      :variant="ui.mode === mode ? 'primary' : 'ghost'"
      :active="ui.mode === mode"
      :info="info(WORKSPACE_MODE_META[mode].infoKey)"
      @click="ui.setMode(mode)"
    />

    <ViewSwitcher v-if="ui.isLive" />

    <SdmxButton
      v-if="ui.isLive"
      :icon="ui.operateLocked ? 'lock' : 'lock_open'"
      :variant="ui.operateLocked ? 'ghost' : 'warning'"
      :info="info(ui.operateLocked ? 'desk.masterBar.operateLocked' : 'desk.masterBar.operateUnlocked')"
      @click="ui.toggleOperateLock()"
    />

    <SdmxButton
      icon="help_outline"
      round
      :variant="ui.infoMode ? 'primary' : 'ghost'"
      :active="ui.infoMode"
      :info="info('desk.masterBar.infoMode')"
      @click="ui.toggleInfoMode()"
    />
    <SdmxButton
      icon="terminal"
      round
      :variant="ui.commandLineOpen ? 'primary' : 'ghost'"
      :active="ui.commandLineOpen"
      :info="info('desk.masterBar.commandLine')"
      @click="ui.toggleCommandLine()"
    />
    <SdmxButton
      v-if="ui.isLive"
      :icon="ui.cueBarCollapsed ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
      round
      :variant="ui.cueBarCollapsed ? 'warning' : 'ghost'"
      :active="!ui.cueBarCollapsed"
      :info="info(ui.cueBarCollapsed ? 'desk.masterBar.showCueBar' : 'desk.masterBar.hideCueBar')"
      @click="ui.cueBarCollapsed = !ui.cueBarCollapsed"
    />

    <q-space />

    <GmFader
      v-model="grandMaster"
      label="GM"
      color="orange"
      :info="info('desk.masterBar.grandMaster')"
      @change="onGrandMasterCommit"
    />
    <GmFader
      v-model="playbackBus"
      label="PB"
      color="deep-purple"
      :info="info('desk.masterBar.playbackBus')"
      @change="onPlaybackBusCommit"
    />

    <SdmxButton
      :label="engine.blackout ? 'BO' : 'Blackout'"
      :variant="engine.blackout ? 'danger' : 'default'"
      :active="engine.blackout"
      :info="info('desk.masterBar.blackout')"
      @click="toggleBlackout"
    />
    <SdmxButton
      :label="scratch.blindMode ? 'Blind' : 'Live'"
      :variant="scratch.blindMode ? 'warning' : 'default'"
      :active="scratch.blindMode"
      :info="info('desk.masterBar.blind')"
      @click="toggleBlind"
    />

    <SdmxStatusChip
      :label="showStore.name"
      icon="description"
      :variant="showStore.isDirty ? 'warning' : 'default'"
      :info="info('desk.masterBar.showFile')"
    />
    <SdmxStatusChip
      :label="String(linkStore.numPeers)"
      icon="link"
      :variant="linkStore.numPeers > 0 ? 'positive' : 'default'"
      :info="info('desk.masterBar.linkPeers')"
    />
    <SdmxStatusChip
      v-if="timecodeActive"
      :label="timecodeStore.smpteLabel"
      icon="schedule"
      :variant="timecodeLocked ? 'active' : 'default'"
      :info="info('desk.masterBar.timecode')"
    />
    <SdmxStatusChip
      v-if="audioStore.enabled"
      label="Audio"
      icon="graphic_eq"
      variant="info"
      :info="info('desk.masterBar.audioReactive')"
    />
  </div>
</template>
