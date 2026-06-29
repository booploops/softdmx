<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
withDefaults(
  defineProps<{
    align?: 'left' | 'center' | 'right' | 'between' | 'around' | 'evenly';
  }>(),
  {
    align: 'right',
  }
);
</script>

<template>
  <q-card-actions
    :align="align"
    class="q-pa-md sdmx-border-top"
  >
    <slot></slot>
  </q-card-actions>
</template>
