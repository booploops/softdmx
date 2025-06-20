import { ref, computed, watch } from "vue";
import { defineStore } from "pinia";
import { useDMXStore } from "./dmx";
import type { RecordedFrame } from "src/types";
import { clone, cloneDeep } from "lodash-es";
import { useLocalStorage } from "@vueuse/core";

export const useRecorderStore = defineStore("recorder-store", () => {
  const dmx = useDMXStore();

  const frames = useLocalStorage<RecordedFrame[]>("recorder-frames", []);

  const activeFrameIndex = ref<number | null>(null);

  const propertiesClipboard = ref<RecordedFrame | null>(null);

  const activeFrame = computed(() => {
    if (activeFrameIndex.value === null || activeFrameIndex.value < 0) {
      return null;
    }
    return frames.value[activeFrameIndex.value] || null;
  });

  const totalFrames = computed(() => {
    return frames.value.length;
  });

  const isPlaying = ref(false);

  const recordFrame = () => {
    const channels = cloneDeep(dmx.channels);
    // if(activeFrame.value) {
    //   // If we are currently editing a frame, update it instead of adding a new one
    //   frames.value[activeFrameIndex.value!] = {
    //     type: "channels",
    //     channels,
    //   };
    //   return;
    // }

    frames.value.push({
      name: `Frame ${frames.value.length + 1}`,
      type: "channels",
      channels,
    });
  };

  const removeKeyframe = (index: number) => {
    if (index < 0 || index >= frames.value.length) {
      console.warn("Index out of bounds for removing keyframe:", index);
      return;
    }
    frames.value.splice(index, 1);
    if (activeFrameIndex.value === index) {
      activeFrameIndex.value = null; // Clear active frame index if it was the removed frame
    } else if (activeFrameIndex.value !== null && activeFrameIndex.value > index)
    {
      activeFrameIndex.value--; // Adjust active frame index if it was after the removed frame
    }
  };

  const removeSelectedKeyframe = () => {
    if (activeFrameIndex.value === null) {
      console.warn("No active frame selected to remove");
      return;
    }
    removeKeyframe(activeFrameIndex.value);
  };

  const stopPlayback = () => {
    if (!isPlaying.value) {
      console.warn("Not currently playing back");
      return;
    }
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    isPlaying.value = false;
  };

  let animationFrameId: number | null = null;

  const copyFrameToClipboard = (frame: RecordedFrame) => {
    propertiesClipboard.value = cloneDeep(frame);
  };

  const pasteFrameFromClipboard = (frameIndex: number) => {
    if (!propertiesClipboard.value) {
      console.warn("Clipboard is empty, nothing to paste");
      return;
    }
    if (frameIndex < 0 || frameIndex >= frames.value.length) {
      console.warn("Invalid frame index for pasting:", frameIndex);
      return;
    }
    const frame = frames.value[frameIndex];
    if(frame) {
      // @ts-ignore
      frame.channels = cloneDeep(propertiesClipboard.value.channels);
    }
  }

  /**
   * Playback test, plays frames using requestAnimationFrame with a delay of 1 second per frame for testing.
   * Set dmx.channels
   */
  const testPlayback = () => {
    if (frames.value.length === 0) {
      console.warn("No frames to playback");
      return;
    }

    if (isPlaying.value) {
      console.warn("Already playing back");
      return;
    }

    isPlaying.value = true;
    let currentFrameIndex = 0;
    let startTime: number | null = null;
    const FRAME_DURATION = 1000; // 1 second per frame

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const frameIndex = Math.floor(elapsed / FRAME_DURATION);

      if (frameIndex >= frames.value.length) {
        isPlaying.value = false;
        return;
      }

      const currentFrame = frames.value[frameIndex];
      if (!currentFrame) {
        console.warn("No current frame found at index:", frameIndex);
        return;
      }

      dmx.channels = clone(currentFrame.channels);

      if (isPlaying.value) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
  };

  const clearFrames = () => {
    frames.value = [];
  };

  watch(activeFrameIndex, (newIndex) => {
    if (newIndex === null || !frames.value[newIndex]) {
      return;
    }
    const frame = frames.value[newIndex];
    if (frame) {
      dmx.channels = clone(frame.channels);
    }
  });

  return {
    frames,
    recordFrame,
    clearFrames,
    totalFrames,
    testPlayback,
    stopPlayback,
    isPlaying,
    activeFrameIndex,
    activeFrame,
    removeKeyframe,
    removeSelectedKeyframe,
    copyFrameToClipboard,
    pasteFrameFromClipboard,
    propertiesClipboard,
  };
});
