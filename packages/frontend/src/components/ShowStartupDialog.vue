<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { Dialog } from 'quasar';
import { useShowStore } from 'src/stores/show';
import { useScratchStore } from 'src/stores/scratch';
import { useUIStore } from 'src/stores/ui';
import { exampleVrClubShow } from 'src/shows/example-vr-club';
import { simpleWashShow } from 'src/shows/simple-wash';
import { laserDemoShow } from 'src/shows/laser-demo';
import { formatLastShowSavedAt, readLastShow } from 'src/utils/last-show';
import type { ShowDocument } from 'src/show/document';

const showStore = useShowStore();
const scratch = useScratchStore();
const ui = useUIStore();

const open = ref(true);
const step = ref<'choose' | 'demo'>('choose');
const fileInput = ref<HTMLInputElement | null>(null);

const lastShow = computed(() => readLastShow());
const hasLastShow = computed(() => !!lastShow.value?.document);

const demoOptions = [
  {
    id: 'simple-wash' as const,
    label: 'Simple Wash',
    caption: 'Small wash rig with color presets.',
    icon: 'light_mode',
    show: simpleWashShow,
  },
  {
    id: 'laser-demo' as const,
    label: 'Laser Demo',
    caption: 'Laser-focused layout with quick beam looks.',
    icon: 'flash_on',
    show: laserDemoShow,
  },
  {
    id: 'vr-club' as const,
    label: 'VR Club',
    caption: 'Full-scene demo with groups, effects, and cues.',
    icon: 'nightlife',
    show: exampleVrClubShow,
  },
];

function finishStartup() {
  open.value = false;
  ui.setMode('live');
}

function loadBlankShow() {
  showStore.newShow();
  scratch.clear();
  finishStartup();
}

function loadLastShow() {
  if (!showStore.loadLastSession()) {
    Dialog.create({
      title: 'No Saved Session',
      message: 'There is no previously opened show to restore.',
    });
    return;
  }
  finishStartup();
}

function openFilePicker() {
  fileInput.value?.click();
}

async function onFilePicked(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';

  if (!file) return;

  try {
    await showStore.loadShowFromFile(file);
    scratch.clear();
    finishStartup();
  } catch (error) {
    Dialog.create({
      title: 'Import Failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function showDemoPicker() {
  step.value = 'demo';
}

function backToChoose() {
  step.value = 'choose';
}

function loadDemo(show: ShowDocument) {
  showStore.loadShow(show);
  scratch.clear();
  finishStartup();
}
</script>

<template>
  <q-dialog v-model="open" persistent>
    <q-card class="sdmx-dialog-card startup-dialog">
      <q-card-section class="startup-header">
        <div>
          <div class="text-h6">Open a show</div>
          <div class="text-body2 text-grey-6">
            Choose how to start this session.
          </div>
        </div>
        <q-icon name="theater_comedy" size="32px" color="primary" />
      </q-card-section>

      <q-separator />

      <q-card-section v-if="step === 'choose'" class="startup-options">
        <button type="button" class="startup-option" @click="loadBlankShow">
          <q-icon name="note_add" size="28px" color="primary" />
          <div class="startup-option-body">
            <div class="startup-option-title">Blank showfile</div>
            <div class="startup-option-caption">Start from an empty show and build your rig.</div>
          </div>
        </button>

        <button
          type="button"
          class="startup-option"
          :class="{ disabled: !hasLastShow }"
          :disabled="!hasLastShow"
          @click="loadLastShow"
        >
          <q-icon name="history" size="28px" color="secondary" />
          <div class="startup-option-body">
            <div class="startup-option-title">Last opened</div>
            <div v-if="hasLastShow" class="startup-option-caption">
              {{ lastShow?.document.meta.name }}
              <span v-if="lastShow?.savedAt"> · {{ formatLastShowSavedAt(lastShow.savedAt) }}</span>
            </div>
            <div v-else class="startup-option-caption">No previous session saved yet.</div>
          </div>
        </button>

        <button type="button" class="startup-option" @click="openFilePicker">
          <q-icon name="upload_file" size="28px" color="accent" />
          <div class="startup-option-body">
            <div class="startup-option-title">Open showfile</div>
            <div class="startup-option-caption">Load a YAML show from disk.</div>
          </div>
        </button>

        <button type="button" class="startup-option" @click="showDemoPicker">
          <q-icon name="auto_awesome" size="28px" color="warning" />
          <div class="startup-option-body">
            <div class="startup-option-title">Load a demo</div>
            <div class="startup-option-caption">Try one of the bundled example shows.</div>
          </div>
        </button>
      </q-card-section>

      <q-card-section v-else class="startup-options">
        <div class="text-subtitle2 q-mb-md">Choose a demo show</div>

        <button
          v-for="demo in demoOptions"
          :key="demo.id"
          type="button"
          class="startup-option"
          @click="loadDemo(demo.show)"
        >
          <q-icon :name="demo.icon" size="28px" color="primary" />
          <div class="startup-option-body">
            <div class="startup-option-title">{{ demo.label }}</div>
            <div class="startup-option-caption">{{ demo.caption }}</div>
          </div>
        </button>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <q-btn
          v-if="step === 'demo'"
          flat
          label="Back"
          icon="arrow_back"
          @click="backToChoose"
        />
      </q-card-actions>

      <input
        ref="fileInput"
        type="file"
        accept=".yml,.yaml"
        hidden
        @change="onFilePicked"
      />
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.startup-dialog {
  width: min(640px, 96vw);
}

.startup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.startup-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.startup-option {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-md, 8px);
  background: var(--sdmx-color-bg-inset);
  color: var(--sdmx-color-text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover:not(.disabled):not(:disabled) {
    border-color: var(--sdmx-color-primary);
    background: color-mix(in srgb, var(--sdmx-color-primary) 8%, var(--sdmx-color-bg-inset));
  }

  &.disabled,
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.startup-option-body {
  min-width: 0;
}

.startup-option-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 2px;
}

.startup-option-caption {
  font-size: 13px;
  color: var(--sdmx-color-text-muted);
  line-height: 1.35;
}
</style>
