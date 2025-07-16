<!--
  Copyright (C) 2025-Present booploops and contributors
  
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useRecorderStore } from 'src/stores/recorder';

const recorder = useRecorderStore();

function handleDragStart(e: DragEvent, index: number) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', index.toString());
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
}

function handleDrop(e: DragEvent, targetIndex: number) {
  e.preventDefault();
  const sourceIndex = parseInt(e.dataTransfer?.getData('text/plain') || '-1');
  if (sourceIndex >= 0 && sourceIndex !== targetIndex) {
    // Create new array and swap items
    const newFrames = [...recorder.frames];
    const [removed] = newFrames.splice(sourceIndex, 1);
    newFrames.splice(targetIndex, 0, removed!);
    // Update the store with new frame order
    recorder.$patch({ frames: newFrames });
  }
}
</script>

<template>
  <q-toolbar>
    <q-btn
      label="X"
      @click="recorder.activeFrameIndex = null"
    />
    <div class="frame-scroller">


      <q-btn
        v-for="(frame, index) in recorder.frames"
        :key="index"
        :class="{
          'bg-primary text-white': recorder.activeFrameIndex === index,
        }"
        draggable="true"
        @dragstart="handleDragStart($event, index)"
        @dragover="handleDragOver"
        @drop="handleDrop($event, index)"
        @click="recorder.activeFrameIndex = index"
        outline
        rounded
      >
        {{ frame.name || `Frame ${index + 1}` }}
        <q-menu context-menu>
          <q-list>
            <q-item
              clickable
              v-close-popup
              @click="recorder.copyFrameToClipboard(frame)"
            >
              <q-item-section>
                Copy Channels
              </q-item-section>
            </q-item>
            <q-item
              clickable
              v-close-popup
              @click="recorder.pasteFrameFromClipboard(index)"
            >
              <q-item-section>
                Paste Channels
              </q-item-section>
            </q-item>
            <q-item
              clickable
              v-close-popup
              @click="recorder.removeKeyframe(index)"
            >
              <q-item-section>
                Remove Keyframe
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>
  </q-toolbar>
  <q-toolbar>
    <q-btn
      label="Record Keyframe"
      @click="recorder.recordFrame"
    />
    <q-btn
      label="Test Playback"
      @click="recorder.testPlayback"
    />
    <q-btn
      label="Stop Playback"
      @click="recorder.stopPlayback"
    />
    <q-btn
      label="Clear Keyframes"
      @click="recorder.clearFrames"
    />

    <div>
      {{ recorder.totalFrames }} frames
    </div>
  </q-toolbar>
</template>

<style scoped>
.frame-scroller {
  overflow: hidden;
  overflow-x: scroll;
  display: flex;
  flex-wrap: nowrap;
  width: 100%;

  >* {
    margin: 0 4px;
    flex-shrink: 0;
    min-width: 100px;
    text-align: center;
  }
}
</style>
