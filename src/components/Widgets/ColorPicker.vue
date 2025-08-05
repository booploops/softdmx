<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--
  Purpose: Color Picker Widget
-->
<script setup lang="ts">
import { ColorPickerModel } from './ColorPicker';

const val = defineModel<ColorPickerModel>({ required: true })

const previewColor = computed(() => {
  const { redChannel, greenChannel, blueChannel } = val.value
  return `rgb(${redChannel.reference.value}, ${greenChannel.reference.value}, ${blueChannel.reference.value})`
})

const color = computed({
  get() {
    return previewColor.value;
  },
  set(value: string) {
    // deconstruct the RGB values from the input string
    const [r, g, b] = value.match(/\d+/g)?.map(Number) || [0, 0, 0];
    // update the model values
    val.value.redChannel.reference.value = r ?? 0;
    val.value.greenChannel.reference.value = g ?? 0;
    val.value.blueChannel.reference.value = b ?? 0;
  }
})

</script>

<template>
  <div class="color-picker-widget">
    <q-color v-model="color" />
  </div>
</template>

<style scoped lang="scss"></style>
