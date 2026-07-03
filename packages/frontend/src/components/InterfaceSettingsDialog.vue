<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import { useUIStore } from 'src/stores/ui';
import { useDeskViewStore } from 'src/stores/desk-view';

const uiStore = useUIStore();
const deskView = useDeskViewStore();

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <VueFinalModal
    class="flex justify-center items-center"
    content-class="sdmx-dialog-card sdmx-dialog-card--narrow"
    @closed="emit('confirm')"
  >
    <XDialogWindow>
      <XDialogTitlebar
        title="Interface"
        @close="emit('confirm')"
      />
      <XDialogContent>
        <XDialogBody class="q-gutter-y-md">
          <XSwitch
            :model-value="uiStore.operateLocked"
            label="Operate lock (hide config UI in Live)"
            @update:model-value="uiStore.toggleOperateLock"
          />

          <div>
            <div class="q-mb-xs text-subtitle2 text-grey-4">Default desk view</div>
            <XSelect
              :model-value="deskView.activeViewId"
              :options="deskView.views.map((v) => ({ label: v.name, value: v.id }))"
              @update:model-value="deskView.setActiveView"
            />
          </div>

          <XSwitch
            v-model="uiStore.programmerCollapsed"
            label="Collapse programmer panel by default"
          />

          <XSwitch
            v-model="uiStore.cueBarCollapsed"
            label="Collapse cue bar by default"
          />
        </XDialogBody>
        <XDialogFooter>
          <XButton label="Close" flat color="default" @click="emit('confirm')" />
        </XDialogFooter>
      </XDialogContent>
    </XDialogWindow>
  </VueFinalModal>
</template>

<style scoped lang="scss"></style>
