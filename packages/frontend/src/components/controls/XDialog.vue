<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { computed } from 'vue';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    dialogRef?: ((el: unknown) => void) | null;
    cardClass?: string;
    narrow?: boolean;
  }>(),
  {
    dialogRef: null,
    cardClass: '',
    narrow: false,
  }
);

const emit = defineEmits<{
  hide: [];
}>();

const cardClasses = computed(() => [
  'sdmx-dialog-card',
  'q-dialog-plugin',
  'x-dialog__card',
  props.cardClass,
  {
    'sdmx-dialog-card--narrow': props.narrow,
  },
]);
</script>

<template>
  <q-dialog
    :ref="props.dialogRef"
    v-bind="$attrs"
    @hide="emit('hide')"
  >
    <q-card :class="cardClasses">
      <slot></slot>
    </q-card>
  </q-dialog>
</template>
