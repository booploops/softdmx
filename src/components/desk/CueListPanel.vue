<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useCueStore } from 'src/stores/cue';
import { useUIStore } from 'src/stores/ui';

const cueStore = useCueStore();
const ui = useUIStore();

function openCueEditor() {
  ui.openDialog('cueEditor');
}
</script>

<template>
  <div class="cue-list-panel q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6">Cues</div>
      <q-space />
      <q-btn color="primary" icon="add" label="New cue" @click="cueStore.addCue(`Cue ${cueStore.cues.length + 1}`)" />
      <q-btn flat icon="movie_edit" label="Cue editor" class="q-ml-sm" @click="openCueEditor" />
    </div>
    <q-list bordered separator>
      <q-item v-for="cue in cueStore.cues" :key="cue.id" clickable @click="cueStore.activeCueId = cue.id">
        <q-item-section>
          <q-item-label>{{ cue.name }}</q-item-label>
          <q-item-label caption>{{ cue.view === 'stack' ? 'Stack' : 'Timeline' }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn dense flat icon="play_arrow" @click.stop="cueStore.playCue(cue.id)" />
          <q-btn dense flat icon="stop" color="negative" @click.stop="cueStore.stopCue(cue.id)" />
        </q-item-section>
      </q-item>
      <q-item v-if="!cueStore.cues.length">
        <q-item-section class="text-grey-5">No cues yet</q-item-section>
      </q-item>
    </q-list>
  </div>
</template>
