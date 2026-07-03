<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'

const props = withDefaults(
  defineProps<{
    title: string;
    message: string;
    placeholder?: string;
    initialValue?: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }>(),
  {
    placeholder: '',
    initialValue: '',
    confirmLabel: 'OK',
    cancelLabel: 'Cancel',
  }
);

const emit = defineEmits<{
  (e: 'confirm', value: string): void;
  (e: 'cancel'): void;
}>();

const value = ref(props.initialValue);
const inputRef = ref<any>(null);

onMounted(() => {
  const el = inputRef.value?.$el?.querySelector('input') || inputRef.value?.querySelector?.('input');
  if (el) {
    el.focus();
    el.select();
  }
});
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
        <XDialogBody class="q-gutter-y-md">
          <div class="text-body2">{{ props.message }}</div>
          <XInput
            ref="inputRef"
            v-model="value"
            :placeholder="props.placeholder"
            @keydown.enter.prevent="emit('confirm', value)"
            @keydown.esc.prevent="emit('cancel')"
          />
        </XDialogBody>
        <XDialogFooter>
          <XButton
            :label="props.cancelLabel"
            flat
            color="default"
            @click="emit('cancel')"
          />
          <XButton
            :label="props.confirmLabel"
            color="primary"
            @click="emit('confirm', value)"
          />
        </XDialogFooter>
      </XDialogContent>
    </XDialogWindow>
  </VueFinalModal>
</template>

<style scoped lang="scss"></style>
