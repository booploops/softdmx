<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useInfoText } from 'src/composables/useInfoText';
import type { TooltipKey } from 'src/lib/info-text';

const props = withDefaults(
  defineProps<{
    icon?: string;
    label?: string;
    color?: string;
    infoKey: TooltipKey;
    infoVars?: Record<string, unknown>;
    alwaysShow?: boolean;
    dense?: boolean;
    flat?: boolean;
    round?: boolean;
    disable?: boolean;
    loading?: boolean;
  }>(),
  {
    alwaysShow: true,
    dense: true,
    flat: true,
    round: false,
    disable: false,
    loading: false,
  }
);

const emit = defineEmits<{ click: [MouseEvent] }>();

const { info } = useInfoText();
const infoText = computed(() => info(props.infoKey, props.infoVars));

const computedSize = computed(() => (props.dense ? 'sm' : 'md'));

const computedColor = computed(() => {
  if (props.color === 'negative') return 'danger';
  if (props.color === 'primary') return 'primary';
  return 'default';
});

function onClick(event: MouseEvent) {
  if (props.disable || props.loading) return;
  emit('click', event);
}
</script>

<template>
  <XButton
    :label="label"
    :color="computedColor"
    :flat="flat"
    :disable="disable"
    :loading="loading"
    :size="computedSize"
    class="sdmx-icon-btn sdmx-focus-ring"
    :class="{ 'sdmx-icon-btn--round': round }"
    :data-sdmx-info="infoText"
    @click="onClick"
  >
    <XIcon v-if="icon && !loading" :name="icon" size="sm" />
    <q-tooltip v-if="alwaysShow">{{ infoText }}</q-tooltip>
  </XButton>
</template>

<style scoped>
.sdmx-icon-btn {
  border-radius: var(--sdmx-radius-button);
}

/* Custom styles for rounded icon buttons */
.sdmx-icon-btn--round {
  border-radius: var(--sdmx-radius-full, 9999px) !important;
  padding: 0 !important;
}
.sdmx-icon-btn--round.x-btn--sm {
  width: 20px !important;
  min-width: 0 !important;
}
.sdmx-icon-btn--round.x-btn--md {
  width: 24px !important;
  min-width: 0 !important;
}
</style>
