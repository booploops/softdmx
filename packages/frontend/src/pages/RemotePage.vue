<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from 'vue';
import { useIOClient } from 'src/lib/io-client';
import type { ShowDocument } from '@softdmx/engine';
import { isSupportedShowVersion } from '@softdmx/engine';
import TouchSurface from 'src/components/touch/TouchSurface.vue';

const socket = useIOClient();
const showDoc = ref<ShowDocument | null>(null);
const isConnected = ref(socket.connected);

const showName = computed(() => showDoc.value?.meta.name ?? 'Remote');
const touchPage = computed(() => showDoc.value?.touch?.pages[0] ?? null);

function requestCurrentState() {
  socket.emit('show:get');
}

function handleConnect() {
  isConnected.value = true;
  requestCurrentState();
}

function handleDisconnect() {
  isConnected.value = false;
}

function handleShowState(payload: ShowDocument) {
  if (isSupportedShowVersion(payload?.version)) {
    showDoc.value = payload;
  }
}

onMounted(() => {
  socket.on('connect', handleConnect);
  socket.on('disconnect', handleDisconnect);
  socket.on('show:state', handleShowState);
  isConnected.value = socket.connected;
  requestCurrentState();
});

onBeforeUnmount(() => {
  socket.off('connect', handleConnect);
  socket.off('disconnect', handleDisconnect);
  socket.off('show:state', handleShowState);
});
</script>

<template>
  <div class="remote-page">
    <header class="remote-header">
      <div class="title-block">
        <div class="title">{{ showName }}</div>
        <div class="subtitle">SoftDMX Touch</div>
      </div>
      <q-badge :color="isConnected ? 'positive' : 'negative'">{{ isConnected ? 'ONLINE' : 'OFFLINE' }}</q-badge>
    </header>
    <TouchSurface :page="touchPage" />
  </div>
</template>

<style scoped>
.remote-page {
  min-height: 100vh;
  padding: 12px;
  background: var(--sdmx-color-bg-page);
  color: var(--sdmx-color-text);
  display: grid;
  gap: 12px;
}
.remote-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-size: 1.2rem;
  font-weight: 700;
}
.subtitle {
  color: var(--sdmx-color-text-muted);
  font-size: 0.85rem;
}
</style>
