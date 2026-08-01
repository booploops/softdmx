<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { ColorPickerModel } from './color-picker.types';
import { useChannelBinding } from 'src/composables/useChannelBinding';
import { SdmxEncoder, SdmxValueField } from 'src/components/ui';

const val = defineModel<ColorPickerModel>({ required: true });

const red = useChannelBinding(val.value.redChannel, 'color');
const green = useChannelBinding(val.value.greenChannel, 'color');
const blue = useChannelBinding(val.value.blueChannel, 'color');

const previewColor = computed(() => `rgb(${red.value}, ${green.value}, ${blue.value})`);

const hexValue = computed(() => {
  const toHex = (channel: number) => channel.toString(16).padStart(2, '0');
  return `#${toHex(red.value)}${toHex(green.value)}${toHex(blue.value)}`.toUpperCase();
});
</script>

<template>
  <div class="color-picker-widget sdmx-widget">
    <div
      class="color-preview"
      :style="{ background: previewColor }"
      aria-hidden="true"
    />
    <div class="color-encoders">
      <SdmxEncoder
        v-model="red"
        label="Red"
        :min="0"
        :max="255"
        :changed="red > 0"
      />
      <SdmxEncoder
        v-model="green"
        label="Green"
        :min="0"
        :max="255"
        :changed="green > 0"
      />
      <SdmxEncoder
        v-model="blue"
        label="Blue"
        :min="0"
        :max="255"
        :changed="blue > 0"
      />
    </div>
    <div class="color-values">
      <SdmxValueField label="RGB" :value="`${red}, ${green}, ${blue}`" size="sm" />
      <SdmxValueField label="Hex" :value="hexValue" size="sm" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.color-picker-widget {
  border-radius: var(--sdmx-radius-md);
  padding: var(--sdmx-space-md);
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-md);
}

.color-preview {
  width: 100%;
  height: 72px;
  border-radius: var(--sdmx-radius-sm);
  border: 1px solid var(--sdmx-color-border);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 8%);
}

.color-encoders {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sdmx-space-sm);
}

.color-values {
  display: flex;
  justify-content: space-between;
  gap: var(--sdmx-space-sm);
}
</style>
