<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useDeskViewStore } from 'src/stores/desk-view';

const deskView = useDeskViewStore();
</script>

<template>
  <q-btn-dropdown dense flat no-caps :label="deskView.activeView.name" icon="view_quilt">
    <q-list dense style="min-width: 160px">
      <q-item
        v-for="view in deskView.views"
        :key="view.id"
        clickable
        v-close-popup
        :active="deskView.activeViewId === view.id"
        active-class="bg-primary text-white"
        @click="deskView.setActiveView(view.id)"
      >
        <q-item-section>{{ view.name }}</q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>
