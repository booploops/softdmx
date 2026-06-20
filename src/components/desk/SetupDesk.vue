<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import SetupNav from './SetupNav.vue';
import PatchPanel from 'src/components/PatchPanel.vue';
import ShowfileEditor from 'src/components/ShowfileEditor.vue';
import VideoMappingPanel from 'src/components/VideoMappingPanel.vue';
import { useUIStore } from 'src/stores/ui';

const ui = useUIStore();
</script>

<template>
  <div class="setup-desk">
    <SetupNav class="setup-nav" />
    <div class="setup-editor">
      <PatchPanel v-if="ui.setupSection === 'patch'" />
      <VideoMappingPanel v-else-if="ui.setupSection === 'video'" />
      <ShowfileEditor v-else-if="ui.setupSection === 'showfile'" embedded />
    </div>
  </div>
</template>
