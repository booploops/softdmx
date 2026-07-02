<script setup lang="ts">
import { ref } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import XButton from 'src/components/controls/XButton.vue';

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

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const selected = ref(props.options[0]?.value ?? '');

function confirmSelection() {
  if (!selected.value) return;
  onDialogOK(selected.value);
}
</script>

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="sdmx-dialog-card sdmx-dialog-card--narrow q-dialog-plugin">
      <q-card-section class="row items-center q-pb-md sdmx-border-bottom">
        <div class="text-h6 font-weight-bold">{{ props.title }}</div>
      </q-card-section>

      <q-card-section class="q-gutter-y-md">
        <div class="text-body2">{{ props.message }}</div>
        <q-list bordered separator class="rounded-borders">
          <q-item
            v-for="option in props.options"
            :key="option.value"
            clickable
            :active="selected === option.value"
            @click="selected = option.value"
          >
            <q-item-section avatar>
              <XIcon :name="option.icon || 'auto_awesome'" />
            </q-item-section>
            <q-item-section>{{ option.label }}</q-item-section>
            <q-item-section side>
              <q-radio :model-value="selected" :val="option.value" @update:model-value="selected = option.value" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md sdmx-border-top">
        <XButton label="Cancel" flat color="default" @click="onDialogCancel" />
        <XButton label="Load" color="primary" :disable="!selected" @click="confirmSelection" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
