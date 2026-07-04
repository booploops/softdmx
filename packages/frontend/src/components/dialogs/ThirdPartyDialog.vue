<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'

const fm = useTemplateRef('fm');
const content = ref('');

const emit = defineEmits<{
    (e: 'confirm'): void
}>()

onMounted(async () => {
    const r = await fetch('/THIRD_PARTY.txt');
    content.value = await r.text();
})
</script>

<template>
    <VueFinalModal
        class="flex justify-center items-center"
        content-class="sdmx-dialog-card sdmx-dialog-card--narrow"
        ref="fm"
    >
        <XDialogWindow>
            <XDialogTitlebar
                title="Third Party Licenses"
                @close="$emit('confirm')"
            />
            <XDialogContent>
                <textarea
                    readonly
                    class="third-party-box"
                    v-text="content"
                ></textarea>
            </XDialogContent>
        </XDialogWindow>
    </VueFinalModal>
</template>

<style scoped lang="scss">
.third-party-box {
    font-family: var(--sdmx-font-family-mono);
    white-space: pre-wrap;
    resize: none;
    width: 100%;
    overflow: hidden;
    overflow-y: scroll;
    min-height: 70vh;
    border: none;
    margin: 0;
    padding: 1em;
    outline: none;
}
</style>