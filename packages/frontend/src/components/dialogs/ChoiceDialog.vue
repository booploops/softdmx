<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'

interface ChoiceOption {
  label: string;
  value: any;
  color?: string;
  textColor?: string;
  size?: 'sm' | 'md' | 'lg';
  flat?: boolean;
  outline?: boolean;
}

const props = defineProps<{
  title: string;
  message: string;
  choices: ChoiceOption[];
}>();

const emit = defineEmits<{
  (e: 'confirm', value: any): void;
  (e: 'cancel'): void;
}>();
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
        <XDialogBody>
          <div class="text-body2">{{ props.message }}</div>
        </XDialogBody>
        <XDialogFooter>
          <XButton
            v-for="(choice, idx) in props.choices"
            :key="idx"
            :label="choice.label"
            :color="choice.color"
            :text-color="choice.textColor"
            :size="choice.size"
            :flat="choice.flat"
            :outline="choice.outline"
            @click="emit('confirm', choice.value)"
          />
        </XDialogFooter>
      </XDialogContent>
    </XDialogWindow>
  </VueFinalModal>
</template>

<style scoped lang="scss"></style>
