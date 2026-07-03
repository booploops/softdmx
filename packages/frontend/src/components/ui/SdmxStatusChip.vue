<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import XChip from 'src/components/controls/XChip.vue';

type StatusVariant = 'default' | 'positive' | 'negative' | 'warning' | 'info' | 'active' | 'armed';

const props = withDefaults(
  defineProps<{
    label: string;
    icon?: string;
    variant?: StatusVariant;
    dense?: boolean;
    info?: string;
  }>(),
  {
    variant: 'default',
    dense: true,
  }
);
</script>

<template>
  <XChip
    class="sdmx-status-chip"
    :label="label"
    :icon="icon"
    :color="variant"
    :dense="dense"
    :data-sdmx-info="info"
  />
</template>

<style scoped>
.sdmx-status-chip {
  max-width: 160px;
}
</style>
