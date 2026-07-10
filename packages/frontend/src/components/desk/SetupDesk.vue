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
import GridNodePreview from 'src/components/GridNodePreview.vue';
import { useUIStore } from 'src/stores/ui';

const ui = useUIStore();
</script>

<template>
  <div class="setup-desk">
    <SetupNav class="setup-nav" />
    <div class="setup-editor">
      <PatchPanel v-if="ui.setupSection === 'patch'" />
      <div v-else-if="ui.setupSection === 'video'" class="setup-video-column">
        <VideoMappingPanel />
        <GridNodePreview class="setup-video-column__preview" />
      </div>
      <ShowfileEditor v-else-if="ui.setupSection === 'showfile'" embedded />
    </div>
  </div>
</template>

<style scoped>
.setup-video-column__preview {
  margin-top: 16px;
}
</style>
