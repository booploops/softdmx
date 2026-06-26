<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import EditModeBanner from './EditModeBanner.vue';
import DeskWorkspace from './DeskWorkspace.vue';
import CueBar from './CueBar.vue';
import { useUIStore } from 'src/stores/ui';

const ui = useUIStore();
</script>

<template>
  <div class="live-desk">
    <EditModeBanner v-if="!ui.operateLocked" />
    <DeskWorkspace />
    <CueBar v-if="!ui.cueBarCollapsed" class="cue-bar" />
  </div>
</template>
