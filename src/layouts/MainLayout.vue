<!--
  Copyright (C) 2025-Present booploops and contributors
  
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<template>
  <q-layout view="hHh Lpr lFf">
    <q-header
      class="bg-dark text-white app-titlebar"
      :class="{
        'is-mac': $q.platform.is.mac
      }"
    >
      <q-toolbar>
        <q-btn
          flat
          icon="fa fa-ellipsis-h"
          aria-label="Menu"
          @click="toggleLeftDrawer"
          class="no-app-drag"
          dense
        />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      bordered
      class="no-app-drag"
    >
      <q-list>
        <q-item-label header>
          Menu
        </q-item-label>

      </q-list>
    </q-drawer>


    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import Titlebar from 'src/components/Titlebar.vue';


const leftDrawerOpen = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>

<style lang="scss" scoped>
.app-titlebar {
  -webkit-app-region: drag;

  &.is-mac {
    padding-left: 64px;
  }
}
</style>
