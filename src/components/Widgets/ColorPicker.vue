<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { ColorPickerModel } from './ColorPicker';
import { useChannelBinding } from 'src/composables/useChannelBinding';

const val = defineModel<ColorPickerModel>({ required: true });

const red = useChannelBinding(val.value.redChannel, 'color');
const green = useChannelBinding(val.value.greenChannel, 'color');
const blue = useChannelBinding(val.value.blueChannel, 'color');

const previewColor = computed(() => {
  return `rgb(${red.value}, ${green.value}, ${blue.value})`;
});

const color = computed({
  get() {
    return previewColor.value;
  },
  set(value: string) {
    if (value.startsWith('#')) {
      const hex = value.replace('#', '');
      const full = hex.length === 3
        ? hex.split('').map((c) => c + c).join('')
        : hex.padEnd(6, '0').slice(0, 6);
      red.value = parseInt(full.slice(0, 2), 16);
      green.value = parseInt(full.slice(2, 4), 16);
      blue.value = parseInt(full.slice(4, 6), 16);
      return;
    }

    const [r, g, b] = value.match(/\d+/g)?.map(Number) || [0, 0, 0];
    red.value = r ?? 0;
    green.value = g ?? 0;
    blue.value = b ?? 0;
  },
});
</script>

<template>
  <div class="color-picker-widget">
    <q-color v-model="color" format-model="rgb" no-header-tabs no-header no-footer />
  </div>
</template>
