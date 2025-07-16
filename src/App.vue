<!--
  Copyright (C) 2025-Present booploops and contributors
  
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
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
