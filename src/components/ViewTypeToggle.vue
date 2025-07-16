<!--
  Copyright (C) 2025-Present booploops and contributors
  
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useUIStore } from 'src/stores/ui';


const ui = useUIStore();

</script>

<template>
  <q-btn-group
    rounded
    unelevated
  >
    <q-btn
      @click="ui.currentTab = 'channels'"
      :class="{
        'bg-primary text-white': ui.currentTab === 'channels',
      }"
    >
      Channels
    </q-btn>
    <q-btn
      @click="ui.currentTab = 'groups'"
      :class="{
        'bg-primary text-white': ui.currentTab === 'groups',
      }"
    >
      Groups
    </q-btn>
  </q-btn-group>
</template>
