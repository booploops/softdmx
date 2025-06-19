<template>
  <router-view />
</template>

<script setup lang="ts">
import { useIOClient } from 'src/lib/io-client';
useIOClient();
</script>
