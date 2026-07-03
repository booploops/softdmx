<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
</script>

<template>
  <VueFinalModal
    class="flex justify-center items-center"
    content-class="sdmx-dialog-card sdmx-dialog-card--narrow"
  >
    <div class="q-pa-md">
      <h3 class="text-h6 q-mt-none q-mb-md">About SoftDMX</h3>
      <p class="text-body1">
        SoftDMX is a software lighting controller for live performance and virtual-world applications.
      </p>
      <p class="text-body2 q-mb-none">Version: 0.0.1</p>
    </div>
  </VueFinalModal>
</template>

<style scoped lang="scss"></style>