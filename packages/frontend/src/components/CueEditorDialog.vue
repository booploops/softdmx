<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed } from 'vue';
import CueEditor from 'src/components/CueEditor.vue';
import { useUIStore } from 'src/stores/ui';

const ui = useUIStore();

const open = computed({
  get: () => ui.dialogs.cueEditor,
  set: (value: boolean) => {
    if (value) ui.openDialog('cueEditor');
    else ui.closeDialog('cueEditor');
  },
});

function close() {
  ui.closeDialog('cueEditor');
}
</script>

<template>
  <q-dialog
    v-model="open"
    maximized
    transition-show="fade"
    transition-hide="fade"
    class="cue-editor-dialog-host"
  >
    <div class="cue-editor-dialog-shell">
      <CueEditor @close="close" />
    </div>
  </q-dialog>
</template>

<style scoped>
.cue-editor-dialog-shell {
  width: 100%;
  height: 100%;
  max-width: 100vw;
  max-height: 100vh;
  overflow: hidden;
  background: var(--sdmx-color-bg-page);
}
</style>
