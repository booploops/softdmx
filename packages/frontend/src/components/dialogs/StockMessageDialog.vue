<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar';
import XButton from 'src/components/controls/XButton.vue';

const props = withDefaults(defineProps<{
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
}>(), {
  confirmLabel: 'OK',
  cancelLabel: 'Cancel',
  showCancel: false,
});

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
</script>

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="sdmx-dialog-card sdmx-dialog-card--narrow q-dialog-plugin">
      <q-card-section class="row items-center q-pb-md sdmx-border-bottom">
        <div class="text-h6 font-weight-bold">{{ props.title }}</div>
      </q-card-section>

      <q-card-section>
        <div class="text-body2">{{ props.message }}</div>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md sdmx-border-top">
        <XButton v-if="props.showCancel" :label="props.cancelLabel" flat color="default" @click="onDialogCancel" />
        <XButton :label="props.confirmLabel" color="primary" @click="onDialogOK(true)" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
