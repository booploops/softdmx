<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useDMXStore } from 'src/stores/dmx';
import { useExecutorStore } from 'src/stores/executor';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useDeskViewStore } from 'src/stores/desk-view';
import { useUIStore } from 'src/stores/ui';
import { useChannelControl } from 'src/composables/useChannelControl';
import MasterBar from 'src/components/desk/MasterBar.vue';
import DeskShell from 'src/components/desk/DeskShell.vue';
import CommandLineBar from 'src/components/desk/CommandLineBar.vue';
import CueEditor from 'src/components/CueEditor.vue';

const dmx = useDMXStore();
const executor = useExecutorStore();
const output = useOutputEngineStore();
const deskView = useDeskViewStore();
const ui = useUIStore();
const { clearScratch } = useChannelControl();

function shouldIgnoreShortcut(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}

function onKeydown(event: KeyboardEvent) {
  if (shouldIgnoreShortcut(event)) return;

  if (event.code === 'Space') {
    event.preventDefault();
    executor.goActive();
    return;
  }
  if (event.code === 'Escape') {
    event.preventDefault();
    if (ui.commandLineOpen) {
      ui.toggleCommandLine(false);
      return;
    }
    if (ui.dialogs.cueEditor) {
      ui.closeDialog('cueEditor');
      return;
    }
    executor.stopAll();
    return;
  }
  if (event.code === 'PageUp') {
    event.preventDefault();
    executor.previousPage();
    return;
  }
  if (event.code === 'PageDown') {
    event.preventDefault();
    executor.nextPage();
    return;
  }
  if (event.code === 'KeyB') {
    event.preventDefault();
    output.setBlackout(!output.blackout);
    return;
  }
  if (event.key === '`' || (event.ctrlKey && event.code === 'KeyK')) {
    event.preventDefault();
    ui.toggleCommandLine();
    return;
  }
  if (event.code === 'KeyI' && event.shiftKey) {
    event.preventDefault();
    ui.toggleInfoMode();
    return;
  }
  if (event.code === 'Delete' && ui.isLive && !ui.dialogs.cueEditor) {
    event.preventDefault();
    clearScratch();
    return;
  }
  if (event.ctrlKey && event.shiftKey && event.code === 'KeyL') {
    event.preventDefault();
    ui.toggleOperateLock();
    return;
  }
  if (event.ctrlKey && event.code.startsWith('Digit')) {
    const index = Number(event.code.replace('Digit', '')) - 1;
    if (index >= 0 && index < 5) {
      event.preventDefault();
      deskView.setActiveViewByIndex(index);
    }
  }
}

onMounted(() => {
  // @ts-ignore debug
  window.$dmx = dmx;
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <q-page class="index-page column no-wrap">
      <MasterBar />
      <div class="index-page-body">
        <CueEditor v-if="ui.dialogs.cueEditor" class="cue-editor-panel" @close="ui.closeDialog('cueEditor')" />
        <DeskShell v-else />
      </div>
      <CommandLineBar />
  </q-page>
</template>

<style scoped>
.index-page {
  flex: 1 1 0;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.index-page-body {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cue-editor-panel {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
</style>
