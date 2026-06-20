<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import LiveDesk from './LiveDesk.vue';
import ProgramDesk from './ProgramDesk.vue';
import TimelineDesk from './TimelineDesk.vue';
import SetupDesk from './SetupDesk.vue';
import { useUIStore } from 'src/stores/ui';

const ui = useUIStore();
</script>

<template>
  <div class="desk-shell-body">
    <LiveDesk v-if="ui.isLive" />
    <ProgramDesk v-else-if="ui.isProgram" />
    <TimelineDesk v-else-if="ui.isTimeline" />
    <SetupDesk v-else />
  </div>
</template>
