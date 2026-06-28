<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { PodRouter } from '@booploops/pod-router';
import { WorkspacePanels } from 'src/lib/workspace-panels';

const path = defineModel<string>();

</script>

<template>
    <div class="ws-panel-container">
        <PodRouter
            :routes="WorkspacePanels"
            v-model="path"
            history="memory"
        ></PodRouter>
    </div>
</template>

<style scoped lang="scss">
.ws-panel-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
</style>