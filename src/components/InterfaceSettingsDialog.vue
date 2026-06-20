<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useUIStore } from 'src/stores/ui';
import { useDeskViewStore } from 'src/stores/desk-view';

const uiStore = useUIStore();
const deskView = useDeskViewStore();
const emit = defineEmits(['close']);
</script>

<template>
  <q-card class="sdmx-dialog-card sdmx-dialog-card--narrow">
    <q-card-section class="row items-center q-pb-md sdmx-border-bottom">
      <div class="text-h6 font-weight-bold">Interface</div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup @click="emit('close')" />
    </q-card-section>

    <q-card-section class="q-gutter-y-md">
      <q-toggle
        :model-value="uiStore.operateLocked"
        color="primary"
        dark
        label="Operate lock (hide config UI in Live)"
        @update:model-value="uiStore.toggleOperateLock"
      />

      <q-select
        :model-value="deskView.activeViewId"
        :options="deskView.views.map((v) => ({ label: v.name, value: v.id }))"
        emit-value
        map-options
        label="Default desk view"
        dark
        outlined
        dense
        @update:model-value="deskView.setActiveView"
      />

      <q-toggle
        v-model="uiStore.programmerCollapsed"
        color="primary"
        dark
        label="Collapse programmer panel by default"
      />

      <q-toggle
        v-model="uiStore.cueBarCollapsed"
        color="primary"
        dark
        label="Collapse cue bar by default"
      />
    </q-card-section>

    <q-card-actions align="right" class="q-pa-md sdmx-border-top">
      <q-btn label="Close" flat color="grey-5" v-close-popup @click="emit('close')" />
    </q-card-actions>
  </q-card>
</template>
