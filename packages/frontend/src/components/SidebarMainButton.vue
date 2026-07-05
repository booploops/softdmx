<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { computed } from "vue";
import { getMainMenu, type MainMenuItem } from "src/lib/main-menu";
import { createMenu } from "src/lib/menus";

const props = defineProps<{
    onImportWorkspace?: () => void;
}>();

const isElectron = computed(() => typeof window.electronTRPC !== "undefined");

function showNativeMainMenu() {
    const mapMenu = (items: MainMenuItem[]): FrontendMenuItem[] => {
        return items.map((item) => {
            const mapped: FrontendMenuItem = {
                label: item.label,
                id: item.label,
            };
            if (item.click) {
                mapped.click = item.click;
            }
            if (item.children) {
                mapped.submenu = mapMenu(item.children);
            }
            return mapped;
        });
    };

    const template = mapMenu(
        getMainMenu({
            onImportWorkspace: props.onImportWorkspace,
        }),
    );
    createMenu(template).show();
}
</script>

<template>
    <button
        class="sidebar-logo"
        type="button"
        tabindex="-1"
        @pointerdown.left="isElectron ? showNativeMainMenu() : undefined"
    >
        <img
            src="logo.avif"
            width="32"
            height="32"
            alt="SoftDMX Logo"
            loading="eager"
            decoding="async"
        />
        <span
            class="menu-indicator"
            aria-hidden="true"
        />
    </button>
</template>

<style scoped lang="scss">
.sidebar-logo {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin: 0;
    border: none;
    background: transparent;
    outline: none;
    box-sizing: border-box;
    overflow: hidden;
    height: auto;

    &::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg,
                rgba(255, 255, 255, 0.15) 0%,
                rgba(255, 255, 255, 0.05) 50%,
                rgba(255, 255, 255, 0) 100%);
        mix-blend-mode: overlay;
        pointer-events: none;
        z-index: 2;
    }

    img {
        position: relative;
        z-index: 1;
        width: 100%;
        height: 100%;
        object-fit: contain;
        // image-rendering: -webkit-optimize-contrast;
        // image-rendering: crisp-edges;
        pointer-events: none;
    }

    .menu-indicator {
        position: absolute;
        bottom: 4px;
        right: 4px;
        width: 0;
        height: 0;
        border-style: solid;
        border-width: 0 0 4px 4px;
        border-color: transparent transparent rgba(255, 255, 255, 0.45) transparent;
        z-index: 4;
        pointer-events: none;
        transition: border-color 0.2s ease;
    }

    &:hover {
        filter: brightness(1.2);

        .menu-indicator {
            border-color: transparent transparent rgba(255, 255, 255, 0.8) transparent;
        }
    }

    &:active {
        filter: brightness(0.9);
    }

    &:after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: rgb(255 255 255 / 12%);
        pointer-events: none;
        z-index: 3;
    }
}
</style>