<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useOutputEngineStore } from 'src/stores/output-engine';

const props = defineProps<{
  modelValue: number;
  label?: string;
  color?: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [number] }>();

const engine = useOutputEngineStore();
const popoverOpen = ref(false);

const percent = computed(() => Math.round(props.modelValue * 100));

function update(value: number | null) {
  if (value === null) return;
  emit('update:modelValue', value);
}
</script>

<template>
  <div class="gm-fader">
    <q-btn dense flat no-caps class="gm-fader-trigger" @click="popoverOpen = true">
      <span class="gm-fader-label">{{ label ?? 'Level' }}</span>
      <span class="gm-fader-value">{{ percent }}%</span>
    </q-btn>
    <q-dialog v-model="popoverOpen">
      <q-card class="gm-fader-popover">
        <q-card-section class="text-subtitle2">{{ label ?? 'Level' }} — {{ percent }}%</q-card-section>
        <q-card-section class="row justify-center">
          <q-slider
            :model-value="modelValue"
            :min="0"
            :max="1"
            :step="0.01"
            vertical
            reverse
            :color="color ?? 'orange'"
            class="vertical-fader"
            @update:model-value="update"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.gm-fader-trigger {
  min-width: 72px;
}
.gm-fader-label {
  font-size: 11px;
  color: var(--sdmx-color-text-muted);
  margin-right: 4px;
}
.gm-fader-value {
  font-size: 12px;
  font-weight: 700;
  color: var(--sdmx-color-gm);
}
.gm-fader-popover {
  min-width: 120px;
}
</style>
