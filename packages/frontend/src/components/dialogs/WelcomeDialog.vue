<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import { useUIStore } from 'src/stores/ui';

const fm = useTemplateRef('fm');
const ui = useUIStore();

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
      <XDialogContent class="p-0 overflow-hidden">
        <!-- Hero Section with Stage Light Gradient -->
        <div class="welcome-hero p-12 text-center relative">
          <div class="welcome-hero__overlay"></div>
          <div class="welcome-hero__content relative">
            <img
              src="icon.avif"
              width="80"
              height="80"
              alt="SoftDMX Logo"
              class="welcome-hero__icon mb-4 mx-auto"
              loading="eager"
              decoding="async"
            />
            <h1 class="text-5xl font-bold text-white my-0 tracking-tight">
              SoftDMX
            </h1>
            <p class="text-base text-gray-300 mt-2 mb-0">
              A modern software DMX lighting console and visual controller.
            </p>
            <div class="text-xs text-gray-400 mt-1">Version 0.0.1</div>
          </div>
        </div>

        <!-- Description & Main Content -->
        <div class="p-6">
          <p class="text-base text-gray-400 text-center px-4 mb-12">
            SoftDMX is built from the ground up for high-performance, real-time lighting control.
            Connect hardware consoles, map fixtures, design dynamic cues, and orchestrate gorgeous light shows with our
            unified control suite.
          </p>

          <!-- Quick Action Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- New Show Card -->
            <div
              class="action-card cursor-pointer p-4 sdmx-panel--inset"
              tabindex="0"
              @click="props.onCreateNewShow?.(); $emit('confirm')"
              @keydown.space.prevent="props.onCreateNewShow?.(); $emit('confirm')"
              @keydown.enter.prevent="props.onCreateNewShow?.(); $emit('confirm')"
            >
              <div class="flex flex-nowrap items-center">
                <XIcon
                  name="circle-plus"
                  size="32px"
                  class="action-card__icon text-[var(--sdmx-color-primary)] mr-4"
                />
                <div>
                  <div class="text-base font-bold text-white">Create New Show</div>
                  <div class="text-xs text-gray-400">Start designing a fresh showfile from scratch.</div>
                </div>
              </div>
            </div>

            <!-- Demo Show Card -->
            <div
              class="action-card cursor-pointer p-4 sdmx-panel--inset"
              tabindex="0"
              @click="props.onLoadDemoShow?.(); $emit('confirm')"
              @keydown.space.prevent="props.onLoadDemoShow?.(); $emit('confirm')"
              @keydown.enter.prevent="props.onLoadDemoShow?.(); $emit('confirm')"
            >
              <div class="flex flex-nowrap items-center">
                <XIcon
                  name="sparkles"
                  size="32px"
                  class="action-card__icon text-[var(--sdmx-color-secondary)] mr-4"
                />
                <div>
                  <div class="text-base font-bold text-white">Load Demo Show</div>
                  <div class="text-xs text-gray-400">Explore pre-built 3D wash and laser demonstrations.</div>
                </div>
              </div>
            </div>

            <!-- Bindings Card -->
            <div
              class="action-card cursor-pointer p-4 sdmx-panel--inset"
              tabindex="0"
              @click="props.onConfigureBindings?.(); $emit('confirm')"
              @keydown.space.prevent="props.onConfigureBindings?.(); $emit('confirm')"
              @keydown.enter.prevent="props.onConfigureBindings?.(); $emit('confirm')"
            >
              <div class="flex flex-nowrap items-center">
                <XIcon
                  name="adjustments"
                  size="32px"
                  class="action-card__icon text-amber-500 mr-4"
                />
                <div>
                  <div class="text-base font-bold text-white">MIDI & OSC Bindings</div>
                  <div class="text-xs text-gray-400">Map physical hardware knobs and sliders to controls.</div>
                </div>
              </div>
            </div>

            <!-- Theme Settings Card -->
            <div
              class="action-card cursor-pointer p-4 sdmx-panel--inset"
              tabindex="0"
              @click="props.onConfigureThemes?.(); $emit('confirm')"
              @keydown.space.prevent="props.onConfigureThemes?.(); $emit('confirm')"
              @keydown.enter.prevent="props.onConfigureThemes?.(); $emit('confirm')"
            >
              <div class="flex flex-nowrap items-center">
                <XIcon
                  name="palette"
                  size="32px"
                  class="action-card__icon text-[var(--sdmx-color-positive)] mr-4"
                />
                <div>
                  <div class="text-base font-bold text-white">Customize Theme</div>
                  <div class="text-xs text-gray-400">Personalize the editor visual theme and colors.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <XDialogFooter
          align="between"
          class="p-4 border-top sdmx-panel--inset"
        >
          <XCheckbox
            v-model="ui.showWelcomeOnStartup"
            label="Show on Startup"
          />
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
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--sdmx-color-border-subtle, #2b2b2b);
  background: #111;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url("/Logo1.avif");
    background-size: cover;
    background-position: center;
    filter: blur(24px);
    transform: scale(1.15);
    opacity: 0.5;
    pointer-events: none;
    z-index: 0;
  }

  &__overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.7) 100%);
    pointer-events: none;
    z-index: 1;
  }

  &__content {
    position: relative;
    z-index: 2;
  }

  &__icon {
    display: block;
    margin: 0 auto;
    width: 80px;
    height: 80px;
    object-fit: contain;
    filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.25));
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
