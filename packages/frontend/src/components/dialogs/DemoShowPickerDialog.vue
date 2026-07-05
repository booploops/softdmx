<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'

type DemoShowOption = {
  label: string;
  value: string;
  icon?: string;
};

const props = defineProps<{
  title: string;
  message: string;
  options: DemoShowOption[];
}>();

const emit = defineEmits<{
  (e: 'confirm', value: string): void;
  (e: 'cancel'): void;
}>();

const selected = ref(props.options[0]?.value ?? '');

function confirmSelection() {
  if (!selected.value) return;
  emit('confirm', selected.value);
}
</script>

<template>
  <VueFinalModal
    class="flex justify-center items-center"
    content-class="sdmx-dialog-card sdmx-dialog-card--narrow"
    @closed="emit('cancel')"
  >
    <XDialogWindow>
      <XDialogTitlebar
        :title="props.title"
        @close="emit('cancel')"
      />
      <XDialogContent>
        <XDialogBody class="flex flex-col gap-4">
          <div class="text-body2">{{ props.message }}</div>
          <XListView
            :bordered="true"
            separator
          >
            <XListItem
              v-for="option in props.options"
              :key="option.value"
              clickable
              :active="selected === option.value"
              @click="selected = option.value"
            >
              <template #prepend>
                <XIcon :name="option.icon || 'auto_awesome'" />
              </template>
              {{ option.label }}
            </XListItem>
          </XListView>
        </XDialogBody>
        <XDialogFooter>
          <XButton
            label="Cancel"
            flat
            color="default"
            @click="emit('cancel')"
          />
          <XButton
            label="Load"
            color="primary"
            :disable="!selected"
            @click="confirmSelection"
          />
        </XDialogFooter>
      </XDialogContent>
    </XDialogWindow>
  </VueFinalModal>
</template>

<style scoped lang="scss"></style>
