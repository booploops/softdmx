<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import XButton from 'src/components/controls/XButton.vue';
import XCard from 'src/components/controls/XCard.vue';
import XSwitch from 'src/components/controls/XSwitch.vue';
import { persistConfigPatch, isElectronConfigEnv } from 'src/lib/config-persistence';
import { trpc } from 'src/lib/trpc';

const listenRemote = ref(false);
const apiToken = ref('');
const recentShows = ref<Array<{ path: string; name: string; modified: string }>>([]);

async function loadRemoteConfig() {
  if (!isElectronConfigEnv) return;
  try {
    const config = await trpc.getConfig.query();
    listenRemote.value = config.remote.listenRemote;
    apiToken.value = config.remote.apiToken;
    recentShows.value = await trpc.getRecentShows.query();
  } catch (error) {
    console.error('Failed to load remote settings:', error);
  }
}

function onListenRemoteChange(value: boolean) {
  listenRemote.value = value;
  persistConfigPatch({ remote: { listenRemote: value } });
}

async function regenerateToken() {
  if (!isElectronConfigEnv) return;
  const result = await trpc.regenerateRemoteApiToken.mutate();
  apiToken.value = result.token;
}

onMounted(() => {
  void loadRemoteConfig();
});
</script>

<template>
  <XCard title="Remote access">
    <div class="q-gutter-y-md">
      <XSwitch
        :model-value="listenRemote"
        label="Listen on all interfaces (requires restart)"
        @update:model-value="onListenRemoteChange"
      />
      <p class="text-caption text-grey-5">
        Default bind is 127.0.0.1. Enable this to allow LAN remotes. A token is generated on first run.
      </p>
      <div v-if="apiToken" class="text-caption">
        API token: <code>{{ apiToken }}</code>
      </div>
      <XButton label="Regenerate token" @click="regenerateToken" />
      <div v-if="recentShows.length > 0">
        <div class="text-subtitle2 q-mb-sm">Recent shows</div>
        <ul class="q-pl-md">
          <li v-for="entry in recentShows" :key="entry.path">
            {{ entry.name }} — {{ entry.path }}
          </li>
        </ul>
      </div>
    </div>
  </XCard>
</template>
