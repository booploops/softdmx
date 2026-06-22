<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { IndexedSelectModel } from './indexed-select.types';
import ChannelAttributeControl from '../ChannelAttributeControl.vue';

const val = defineModel<IndexedSelectModel>({ required: true });
</script>

<template>
  <div class="indexed-select-widget">
    <div class="widget-title">{{ val.channel.name }}</div>
    <ChannelAttributeControl
      :channel="val.channel"
      :path="val.channel.reference.path"
    />
  </div>
</template>

<style scoped lang="scss">
.indexed-select-widget {
  background: var(--sdmx-color-bg-surface);
  border-radius: 8px;
  padding: 16px;
  min-width: 200px;
}

.widget-title {
  font-weight: 600;
  margin-bottom: 8px;
}
</style>
