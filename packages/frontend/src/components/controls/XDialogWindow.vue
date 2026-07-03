<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">

</script>

<template>
  <div class="x-dialog-window">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.x-dialog-window {
  box-shadow: 0 0 0 1px var(--sdmx-color-primary);
  border-radius: 3px;
  background: var(--sdmx-color-bg-elevated);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>