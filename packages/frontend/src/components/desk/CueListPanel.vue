<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { SdmxButton, SdmxIconButton } from 'src/components/ui';
import { useCueStore } from 'src/stores/cue';
import { useUIStore } from 'src/stores/ui';
import { useInfoText } from 'src/composables/useInfoText';

const cueStore = useCueStore();
const ui = useUIStore();
const { info } = useInfoText();

function openCueEditor() {
  ui.openDialog('cueEditor');
}
</script>

<template>
  <div class="cue-list-panel q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6">Cues</div>
      <q-space />
      <SdmxButton variant="primary" :info="info('desk.cueList.add')" icon="plus" label="New cue" @click="cueStore.addCue(`Cue ${cueStore.cues.length + 1}`)" />
      <SdmxButton variant="ghost" :info="info('desk.cueList.openEditor')" icon="movie" label="Cue editor" class="q-ml-sm" @click="openCueEditor" />
    </div>
    <q-list bordered separator>
      <q-item v-for="cue in cueStore.cues" :key="cue.id" clickable @click="cueStore.activeCueId = cue.id">
        <q-item-section>
          <q-item-label>{{ cue.name }}</q-item-label>
          <q-item-label caption>{{ cue.view === 'stack' ? 'Stack' : 'Timeline' }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <SdmxIconButton size="sm" info-key='desk.cueList.play' icon="player-play-filled" @click.stop="cueStore.playCue(cue.id)" />
          <SdmxIconButton color="negative" size="sm" info-key='desk.cueList.stop' icon="square" @click.stop="cueStore.stopCue(cue.id)" />
        </q-item-section>
      </q-item>
      <q-item v-if="!cueStore.cues.length">
        <q-item-section class="text-grey-5">No cues yet</q-item-section>
      </q-item>
    </q-list>
  </div>
</template>
