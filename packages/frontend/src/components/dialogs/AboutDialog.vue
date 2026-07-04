<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { showThirdPartyDialog } from 'src/lib/CommonDialogs';
import { VueFinalModal } from 'vue-final-modal'

const fm = useTemplateRef('fm');

const emit = defineEmits<{
  (e: 'confirm'): void
}>()
</script>

<template>
  <VueFinalModal
    class="flex justify-center items-center"
    content-class="sdmx-dialog-card sdmx-dialog-card--narrow"
    ref="fm"
  >
    <XDialogWindow>
      <XDialogTitlebar
        title="About SoftDMX"
        @close="$emit('confirm')"
      />
      <XDialogContent>
        <div class="p-10 flex flex-col items-center gap-4">
          <div class="font-bold text-4xl">
            SoftDMX
          </div>
          <div class="text-gray-400">
            Version: 0.0.1
          </div>
          <XButton
            @click="showThirdPartyDialog"
            label="Third Party Licenses"
          ></XButton>
        </div>
      </XDialogContent>
    </XDialogWindow>
  </VueFinalModal>
</template>

<style scoped lang="scss"></style>