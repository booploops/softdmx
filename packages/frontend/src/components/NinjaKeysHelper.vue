<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { NinjaKeys } from 'ninja-keys'
import { useCommandPaletteStore } from 'src/stores/command-palette'

const ninjakeys = ref<NinjaKeys>()
const store = useCommandPaletteStore()

watch(
  [ninjakeys, () => store.commands],
  ([ninja, commands]) => {
    if (ninja) {
      ninja.data = commands
    }
  },
  { immediate: true }
)

onMounted(() => {
  store.setOpenCallback(() => {
    ninjakeys.value?.open()
  })
})

onUnmounted(() => {
  store.setOpenCallback(null)
})
</script>

<template>
  <ninja-keys ref="ninjakeys"> </ninja-keys>
</template>

<style lang="scss">
ninja-keys {
  z-index: 9999;

}
</style>