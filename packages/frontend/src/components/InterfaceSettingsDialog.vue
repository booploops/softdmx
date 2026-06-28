<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar';
import { useUIStore } from 'src/stores/ui';
import { useDeskViewStore } from 'src/stores/desk-view';

const uiStore = useUIStore();
const deskView = useDeskViewStore();

import XButton from 'src/components/controls/XButton.vue';
import XSelect from 'src/components/controls/XSelect.vue';
import XSwitch from 'src/components/controls/XSwitch.vue';

defineEmits([
  ...useDialogPluginComponent.emits
]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
</script>

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="sdmx-dialog-card sdmx-dialog-card--narrow q-dialog-plugin">
      <q-card-section class="row items-center q-pb-md sdmx-border-bottom">
        <div class="text-h6 font-weight-bold">Interface</div>
        <q-space />
        <XButton icon="close" flat size="sm" @click="onDialogCancel" />
      </q-card-section>

      <q-card-section class="q-gutter-y-md">
        <XSwitch
          :model-value="uiStore.operateLocked"
          label="Operate lock (hide config UI in Live)"
          @update:model-value="uiStore.toggleOperateLock"
        />

        <div>
          <div class="q-mb-xs text-subtitle2 text-grey-4">Default desk view</div>
          <XSelect
            :model-value="deskView.activeViewId"
            :options="deskView.views.map((v) => ({ label: v.name, value: v.id }))"
            @update:model-value="deskView.setActiveView"
          />
        </div>

        <XSwitch
          v-model="uiStore.programmerCollapsed"
          label="Collapse programmer panel by default"
        />

        <XSwitch
          v-model="uiStore.cueBarCollapsed"
          label="Collapse cue bar by default"
        />
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md sdmx-border-top">
        <XButton label="Close" flat color="default" @click="onDialogOK" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

