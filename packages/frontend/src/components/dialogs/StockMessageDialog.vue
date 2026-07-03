<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'

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

const emit = defineEmits<{
  (e: 'confirm', value: boolean): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <VueFinalModal
    class="flex justify-center items-center"
    content-class="sdmx-dialog-card sdmx-dialog-card--narrow"
    @closed="emit('cancel')"
  >
    <XDialogWindow>
      <XDialogTitlebar
        :title="props.title"
        @close="emit('cancel')"
      />
      <XDialogContent>
        <XDialogBody>
          <div class="text-body2">{{ props.message }}</div>
        </XDialogBody>
        <XDialogFooter>
          <XButton
            v-if="props.showCancel"
            :label="props.cancelLabel"
            flat
            color="default"
            @click="emit('cancel')"
          />
          <XButton
            :label="props.confirmLabel"
            color="primary"
            @click="emit('confirm', true)"
          />
        </XDialogFooter>
      </XDialogContent>
    </XDialogWindow>
  </VueFinalModal>
</template>

<style scoped lang="scss"></style>
