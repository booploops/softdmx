<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
defineProps<{
  title?: string;
}>();
</script>

<template>
  <q-card-section class="row items-center q-pb-md sdmx-border-bottom">
    <div
      v-if="title"
      class="text-h6 font-weight-bold"
    >
      {{ title }}
    </div>
    <slot></slot>
  </q-card-section>
</template>
