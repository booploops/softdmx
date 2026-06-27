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

function onClick(event: MouseEvent) {
  if (props.disable || props.loading) return;
  emit('click', event);
}
</script>

<template>
  <q-btn
    :icon="icon"
    :label="label"
    :color="color"
    :dense="dense"
    :flat="flat"
    :round="round && !label"
    :disable="disable"
    :loading="loading"
    unelevated
    no-caps
    class="sdmx-icon-btn sdmx-focus-ring"
    :data-sdmx-info="infoText"
    @click="onClick"
  >
    <q-tooltip v-if="alwaysShow">{{ infoText }}</q-tooltip>
  </q-btn>
</template>

<style scoped>
.sdmx-icon-btn {
  border-radius: var(--sdmx-radius-button);
}
</style>
