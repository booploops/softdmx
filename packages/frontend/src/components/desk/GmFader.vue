<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { SdmxButton, SdmxFader, SdmxValueField } from 'src/components/ui';

const props = defineProps<{
  modelValue: number;
  label?: string;
  color?: string;
  info?: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [number]; change: [number] }>();

const popoverOpen = ref(false);
const percent = computed(() => Math.round(props.modelValue * 100));

function update(value: number) {
  emit('update:modelValue', value);
}

function onChange(value: number) {
  emit('change', value);
}
</script>

<template>
  <div class="gm-fader">
    <SdmxButton
      variant="ghost"
      :info="info"
      @click="popoverOpen = true"
    >
      <SdmxValueField :label="label ?? 'Level'" :value="percent" unit="%" size="sm" :color="color ? undefined : 'var(--sdmx-color-gm)'" />
    </SdmxButton>
    <q-dialog v-model="popoverOpen">
      <q-card class="gm-fader-popover sdmx-dialog-card sdmx-dialog-card--narrow">
        <q-card-section class="sdmx-text-title">{{ label ?? 'Level' }} — {{ percent }}%</q-card-section>
        <q-card-section class="row justify-center">
          <SdmxFader
            :model-value="modelValue"
            vertical
            :color="color ?? 'orange'"
            @update:model-value="update"
            @change="onChange"
          />
        </q-card-section>
        <q-card-actions align="right">
          <SdmxButton label="Close" variant="ghost" @click="popoverOpen = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.gm-fader-popover {
  min-width: 120px;
}
</style>
