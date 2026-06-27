<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
defineProps<{
  icon?: string;
  title: string;
  hint?: string;
  info?: string;
}>();
</script>

<template>
  <div class="sdmx-empty-state" :data-sdmx-info="info">
    <q-icon v-if="icon" :name="icon" class="sdmx-empty-state__icon" />
    <span class="sdmx-empty-state__title">{{ title }}</span>
    <span v-if="hint" class="sdmx-empty-state__hint">{{ hint }}</span>
    <slot />
  </div>
</template>
