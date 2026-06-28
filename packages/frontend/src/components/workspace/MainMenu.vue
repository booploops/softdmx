<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { computed } from 'vue';
import { getMainMenu } from 'src/lib/main-menu';

const props = withDefaults(
    defineProps<{
        items?: any[];
        isSubmenu?: boolean;
    }>(),
    {
        isSubmenu: false,
    }
);

const menuItems = computed(() => {
    return props.items || getMainMenu();
});
</script>

<template>
    <q-menu
        :anchor="isSubmenu ? 'top end' : 'bottom right'"
        :self="isSubmenu ? 'top start' : 'top left'"
        class="sdmx-menu main-menu"
        :offset="isSubmenu ? [0, 4] : [0, 0]"
    >
        <q-list style="min-width: 200px">
            <template
                v-for="(item, index) in menuItems"
                :key="index"
            >
                <!-- Item with Submenu (Children) -->
                <q-item
                    v-if="item.children && item.children.length"
                    clickable
                    class="main-menu-item"
                >
                    <q-item-section
                        v-if="item.icon"
                        avatar
                        class="main-menu-icon-section"
                    >
                        <i :class="['codicon', item.icon]" />
                    </q-item-section>
                    <q-item-section class="main-menu-label-section">
                        {{ item.label }}
                    </q-item-section>
                    <q-item-section side>
                        <i class="codicon codicon-chevron-right submenu-arrow-icon" />
                    </q-item-section>

                    <!-- Recursive child menu -->
                    <MainMenu
                        :items="item.children"
                        :is-submenu="true"
                    />
                </q-item>

                <!-- Standard Action Item -->
                <q-item
                    v-else
                    clickable
                    v-close-popup
                    @click="item.click ? item.click() : null"
                    class="main-menu-item"
                >
                    <q-item-section
                        v-if="item.icon"
                        avatar
                        class="main-menu-icon-section"
                    >
                        <i :class="['codicon', item.icon]" />
                    </q-item-section>
                    <q-item-section class="main-menu-label-section">
                        {{ item.label }}
                    </q-item-section>
                </q-item>
            </template>
        </q-list>
    </q-menu>
</template>

<style scoped lang="scss"></style>