<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import XButton from './XButton.vue';

type ColorVariant = 'default' | 'primary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    label?: string;
    icon?: string;
    disable?: boolean;
    flat?: boolean;
    outline?: boolean;
    color?: ColorVariant;
    size?: ButtonSize;
  }>(),
  {
    disable: false,
    flat: false,
    outline: false,
    color: 'default',
    size: 'md',
  }
);

const menuOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

function toggleMenu() {
  if (props.disable) return;
  menuOpen.value = !menuOpen.value;
}

function handleOutsideClick(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    menuOpen.value = false;
  }
}

function handleItemClick() {
  menuOpen.value = false;
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>

<template>
  <div class="x-dropdown" ref="dropdownRef" @keydown.esc="menuOpen = false">
    <XButton
      :disable="disable"
      :flat="flat"
      :outline="outline"
      :color="color"
      :size="size"
      @click="toggleMenu"
    >
      <template #default>
        <span class="x-dropdown__content">
          <XIcon v-if="icon" :name="icon" class="x-dropdown__icon" />
          <span v-if="label" class="x-dropdown__label">{{ label }}</span>
          <svg viewBox="0 0 10 6" class="x-dropdown__arrow">
            <path d="M5 6L0 0H10L5 6Z" fill="currentColor" />
          </svg>
        </span>
      </template>
    </XButton>

    <!-- Custom dropdown popover panel -->
    <div
      v-if="menuOpen"
      class="x-dropdown-menu"
      @click="handleItemClick"
    >
      <slot></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.x-dropdown {
  display: inline-block;
  position: relative;

  &__content {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 100%;
  }

  &__arrow {
    width: 8px;
    height: 5px;
    margin-left: 2px;
    opacity: 0.7;
  }
}

.x-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  margin-top: 4px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
  min-width: 120px;
  box-sizing: border-box;
}
</style>

<style lang="scss">
// Global dark mode overrides for custom dropdown menu
.body--dark {
  .x-dropdown-menu {
    background: #2d2d2d !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
  }
}
</style>
