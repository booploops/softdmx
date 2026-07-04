<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'

const fm = useTemplateRef('fm');

const emit = defineEmits<{
  (e: 'confirm'): void;
}>();

const props = defineProps<{
  onCreateNewShow?: () => void;
  onLoadDemoShow?: () => void;
  onConfigureBindings?: () => void;
  onConfigureThemes?: () => void;
}>();
</script>

<template>
  <VueFinalModal
    class="flex justify-center items-center"
    content-class="sdmx-dialog-card"
    ref="fm"
  >
    <XDialogWindow>
      <XDialogTitlebar
        title="Welcome to SoftDMX"
        @close="$emit('confirm')"
      />
      <XDialogContent class="q-pa-none overflow-hidden">
        <!-- Hero Section with Stage Light Gradient -->
        <div class="welcome-hero q-pa-xl text-center relative-position">
          <div class="welcome-hero__overlay"></div>
          <div class="welcome-hero__content relative-position">
            <XIcon
              name="sun"
              size="56px"
              class="welcome-hero__icon q-mb-md text-amber"
            />
            <h1 class="text-h3 text-bold text-white q-my-none tracking-tight">
              SoftDMX
            </h1>
            <p class="text-subtitle1 text-grey-3 q-mt-sm q-mb-none">
              A modern software DMX lighting console and visual controller.
            </p>
            <div class="text-caption text-grey-4 q-mt-xs">Version 0.0.1</div>
          </div>
        </div>

        <!-- Description & Main Content -->
        <div class="q-pa-lg">
          <p class="text-body1 text-grey-4 text-center q-px-md q-mb-xl">
            SoftDMX is built from the ground up for high-performance, real-time lighting control.
            Connect hardware consoles, map fixtures, design dynamic cues, and orchestrate gorgeous light shows with our
            unified control suite.
          </p>

          <!-- Quick Action Grid -->
          <div class="row q-col-gutter-md">
            <!-- New Show Card -->
            <div class="col-12 col-sm-6">
              <div
                class="action-card cursor-pointer q-pa-md sdmx-panel--inset"
                tabindex="0"
                @click="props.onCreateNewShow?.(); $emit('confirm')"
                @keydown.space.prevent="props.onCreateNewShow?.(); $emit('confirm')"
                @keydown.enter.prevent="props.onCreateNewShow?.(); $emit('confirm')"
              >
                <div class="row no-wrap items-center">
                  <XIcon
                    name="circle-plus"
                    size="32px"
                    class="action-card__icon text-primary q-mr-md"
                  />
                  <div>
                    <div class="text-subtitle1 text-bold text-white">Create New Show</div>
                    <div class="text-caption text-grey-5">Start designing a fresh showfile from scratch.</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Demo Show Card -->
            <div class="col-12 col-sm-6">
              <div
                class="action-card cursor-pointer q-pa-md sdmx-panel--inset"
                tabindex="0"
                @click="props.onLoadDemoShow?.(); $emit('confirm')"
                @keydown.space.prevent="props.onLoadDemoShow?.(); $emit('confirm')"
                @keydown.enter.prevent="props.onLoadDemoShow?.(); $emit('confirm')"
              >
                <div class="row no-wrap items-center">
                  <XIcon
                    name="sparkles"
                    size="32px"
                    class="action-card__icon text-secondary q-mr-md"
                  />
                  <div>
                    <div class="text-subtitle1 text-bold text-white">Load Demo Show</div>
                    <div class="text-caption text-grey-5">Explore pre-built 3D wash and laser demonstrations.</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bindings Card -->
            <div class="col-12 col-sm-6">
              <div
                class="action-card cursor-pointer q-pa-md sdmx-panel--inset"
                tabindex="0"
                @click="props.onConfigureBindings?.(); $emit('confirm')"
                @keydown.space.prevent="props.onConfigureBindings?.(); $emit('confirm')"
                @keydown.enter.prevent="props.onConfigureBindings?.(); $emit('confirm')"
              >
                <div class="row no-wrap items-center">
                  <XIcon
                    name="adjustments"
                    size="32px"
                    class="action-card__icon text-amber q-mr-md"
                  />
                  <div>
                    <div class="text-subtitle1 text-bold text-white">MIDI & OSC Bindings</div>
                    <div class="text-caption text-grey-5">Map physical hardware knobs and sliders to controls.</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Theme Settings Card -->
            <div class="col-12 col-sm-6">
              <div
                class="action-card cursor-pointer q-pa-md sdmx-panel--inset"
                tabindex="0"
                @click="props.onConfigureThemes?.(); $emit('confirm')"
                @keydown.space.prevent="props.onConfigureThemes?.(); $emit('confirm')"
                @keydown.enter.prevent="props.onConfigureThemes?.(); $emit('confirm')"
              >
                <div class="row no-wrap items-center">
                  <XIcon
                    name="palette"
                    size="32px"
                    class="action-card__icon text-positive q-mr-md"
                  />
                  <div>
                    <div class="text-subtitle1 text-bold text-white">Customize Theme</div>
                    <div class="text-caption text-grey-5">Personalize the editor visual theme and colors.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <XDialogFooter class="q-pa-md border-top sdmx-panel--inset justify-center">
          <XButton
            label="Let's Go!"
            color="primary"
            @click="$emit('confirm')"
          />
        </XDialogFooter>
      </XDialogContent>
    </XDialogWindow>
  </VueFinalModal>
</template>

<style scoped lang="scss">
.welcome-hero {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 40%, #db2777 100%);
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--sdmx-color-border-subtle, #2b2b2b);

  &__overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.4) 100%);
    pointer-events: none;
  }

  &__icon {
    filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.4));
  }
}

.tracking-tight {
  letter-spacing: -0.05em;
}

.border-top {
  border-top: 1px solid var(--sdmx-color-border-subtle, #2b2b2b);
}

.action-card {
  border-radius: var(--sdmx-radius-md, 8px);
  border: 1px solid var(--sdmx-color-border-subtle, #2b2b2b);
  outline: none;

  &:hover {
    background-color: rgba(255, 255, 255, 0.04) !important;
    border-color: var(--sdmx-color-primary, #4f46e5);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }

  &:active {
    background-color: rgba(255, 255, 255, 0.08) !important;
  }

  &:focus-visible {
    box-shadow: 0 0 0 2.5px rgba(10, 132, 255, 0.5) !important;
    border-color: #0a84ff !important;
  }
}

.welcome-close-btn {
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);

  &:hover {
    box-shadow: 0 6px 20px rgba(79, 70, 229, 0.5);
  }
}
</style>
