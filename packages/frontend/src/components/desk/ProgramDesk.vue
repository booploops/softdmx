<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import ProgramNav from './ProgramNav.vue';
import ExecutorEditor from './ExecutorEditor.vue';
import PresetPanel from 'src/components/PresetPanel.vue';
import EffectsPanel from 'src/components/EffectsPanel.vue';
import AudioPanel from 'src/components/AudioPanel.vue';
import CueListPanel from './CueListPanel.vue';
import TouchLayoutEditor from './TouchLayoutEditor.vue';
import { useUIStore } from 'src/stores/ui';

const ui = useUIStore();
</script>

<template>
  <div class="program-desk">
    <ProgramNav class="program-nav" />
    <div class="program-editor">
      <ExecutorEditor v-if="ui.programSection === 'executors'" />
      <PresetPanel v-else-if="ui.programSection === 'presets'" />
      <EffectsPanel v-else-if="ui.programSection === 'effects'" />
      <AudioPanel v-else-if="ui.programSection === 'audio'" />
      <CueListPanel v-else-if="ui.programSection === 'cues'" />
      <TouchLayoutEditor v-else-if="ui.programSection === 'touch'" />
    </div>
  </div>
</template>
