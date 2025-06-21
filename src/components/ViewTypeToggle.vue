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
