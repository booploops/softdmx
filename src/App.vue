<script setup lang="ts">
import "@fontsource-variable/roboto-flex";
import { useIOClient } from 'src/lib/io-client';
import { Dark } from 'quasar'

useIOClient();

Dark.set(true);
</script>

<template>
  <router-view />
</template>
