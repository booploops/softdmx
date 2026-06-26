<!--
  Copyright (C) 2025-Present booploops and contributors
  
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<template>
  <q-layout view="hHh lpr lFf" class="app-layout">
    <a href="#main-content" class="skip-link sdmx-focus-ring">Skip to main content</a>
    <q-header
      class="bg-dark text-white app-titlebar"
      :class="{
        'is-mac': $q.platform.is.mac
      }"
    >
      <q-toolbar class="titlebar-toolbar">
        <q-btn
          flat
          icon="fa fa-ellipsis-h"
          aria-label="Menu"
          @click="ui.toggleLeftDrawer()"
          class="no-app-drag"
          dense
        />
        <q-toolbar-title class="titlebar-title no-app-drag">
          SoftDMX
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="ui.leftDrawerOpen"
      bordered
      class="no-app-drag sdmx-drawer"
      :class="{ 'sdmx-drawer--mac': $q.platform.is.mac }"
      :width="280"
      overlay
      behavior="mobile"
    >
      <AppSidebarMenu />
    </q-drawer>

    <q-page-container id="main-content" class="app-page-container">
      <router-view />
    </q-page-container>

    <ShowStartupDialog />
  </q-layout>
</template>

<script setup lang="ts">
import AppSidebarMenu from 'src/components/AppSidebarMenu.vue';
import ShowStartupDialog from 'src/components/ShowStartupDialog.vue';
import { useUIStore } from 'src/stores/ui';
import { useQuasar } from 'quasar';

const ui = useUIStore();
const $q = useQuasar();
</script>

<style lang="scss" scoped>
.app-layout {
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}

.app-titlebar {
  -webkit-app-region: drag;
}

.titlebar-toolbar {
  min-height: 36px;
  padding-right: 8px;
}

.titlebar-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  -webkit-app-region: drag;
}

.app-page-container {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.app-page-container :deep(.q-page) {
  flex: 1 1 0;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.skip-link {
  position: absolute;
  top: -100px;
  left: var(--sdmx-space-sm);
  z-index: 10000;
  padding: var(--sdmx-space-sm) var(--sdmx-space-md);
  background: var(--sdmx-color-primary);
  color: var(--sdmx-color-text);
  border-radius: var(--sdmx-radius-sm);
  text-decoration: none;
  font-size: var(--sdmx-font-size-label);
}

.skip-link:focus {
  top: var(--sdmx-space-sm);
}
</style>

<style lang="scss">
.no-app-drag {
  -webkit-app-region: no-drag;
}

.sdmx-drawer--mac .q-drawer__content {
  padding-top: var(--sdmx-mac-titlebar-inset-top);
  padding-left: var(--sdmx-mac-titlebar-inset-left);
}
</style>
