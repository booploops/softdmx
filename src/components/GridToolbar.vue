<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { Dialog } from 'quasar';
import { TestShowfile } from 'src/shows/TestShowfile';
import { useDMXStore } from 'src/stores/dmx';
import { useUIStore } from 'src/stores/ui';
import ViewTypeToggle from './ViewTypeToggle.vue';
import CueEditor from './CueEditor.vue';

const ui = useUIStore();
const dmx = useDMXStore();

// Cue Editor dialog state
const showCueEditor = ref(false);

const hasGroups = computed(() => {
  return (dmx.showfile?.linkedGroups || []).length > 0;
});


const reloadShowfile = () => {
  dmx.loadShowfile(TestShowfile);
};

const maxValues = () => {
  dmx.channels.forEach(channel => {
    channel.value = 255; // Set all channels to maximum value
  });
};

const blackOut = () => {
  dmx.channels.forEach(channel => {
    channel.value = 0; // Set all channels to minimum value
  });
};
const chaos = () => {
  dmx.channels.forEach(channel => {
    channel.value = Math.floor(Math.random() * 256); // Set channels to random values
  });
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    console.log('Copied to clipboard:', text);
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

const copyFrames = () => {
  // This functionality has been moved to the new Cue System
  console.log('Frame copying is now handled by the Cue Editor');
}

const pasteFrames = () => {
  // This functionality has been moved to the new Cue System
  console.log('Frame pasting is now handled by the Cue Editor');
}

const copyCurrentChannels = () => {
  const channels = dmx.channels;
  copyToClipboard(JSON.stringify(channels));
}

const pasteChannels = () => {
  Dialog.create({
    title: 'Paste channels JSON data:',
    message: 'Please paste your JSON data below:',
    prompt: {
      model: '',
      type: 'textarea',
      placeholder: 'Paste your JSON data here...'
    },
  }).onOk((data) => {
    if (data) {
      try {
        const channels = JSON.parse(data);
        dmx.channels = channels;
      } catch (error) {
        console.error('Failed to parse JSON data: ', error);
      }
    }
  });
}

const propertiesToAnimate = [
  'Red', 'Green', 'Blue',
  'Pan',
  'Tilt',
];

const animationIntervals: Record<string, ReturnType<typeof setInterval> | null> = {};
const clearAnimationIntervals = () => {
  Object.values(animationIntervals).forEach(interval => {
    if (interval) {
      clearInterval(interval);
    }
  });
  Object.keys(animationIntervals).forEach(key => {
    animationIntervals[key] = null;
  });
};


// Animation that cycles through colors from red to blue to green and back to red
const colorCycleAnimation = () => {
  if (animationIntervals['colorCycle']) {
    clearInterval(animationIntervals['colorCycle']);
    animationIntervals['colorCycle'] = null;
    return;
  }
  animationIntervals['colorCycle'] = setInterval(() => {
    dmx.showfileFixturesMapped.forEach(fixture => {
      fixture.def.channels.forEach(channel => {
        if (propertiesToAnimate.includes(channel.name)) {
          // Cycle through colors
          if (channel.name === 'Red') {
            channel.reference!.value = (channel.reference!.value + 5) % 256;
          } else if (channel.name === 'Green') {
            channel.reference!.value = (channel.reference!.value + 3) % 256;
          } else if (channel.name === 'Blue') {
            channel.reference!.value = (channel.reference!.value + 2) % 256;
          } else if (channel.name === 'Pan') {
            channel.reference!.value = (channel.reference!.value + 1) % 256;
          } else if (channel.name === 'Tilt') {
            channel.reference!.value = (channel.reference!.value + 4) % 256;
          }
        }
      });
    });
  }, 100); // ~10fps
};

// Sways around the light fixtures across the dance floor, uses Pan and Tilt channels
const lightFixtureSway = () => {
  if (animationIntervals['lightFixtureSway']) {
    clearInterval(animationIntervals['lightFixtureSway']);
    animationIntervals['lightFixtureSway'] = null;
    return;
  }

  let panDirection = 1; // 1 for right, -1 for left
  let tiltDirection = 1; // 1 for up, -1 for down

  animationIntervals['lightFixtureSway'] = setInterval(() => {
    dmx.showfileFixturesMapped.forEach(fixture => {
      fixture.def.channels.forEach(channel => {
        if (channel.name === 'Pan') {
          channel.reference!.value += panDirection * 5; // Adjust Pan value
          if (channel.reference!.value >= 255 || channel.reference!.value <= 0) {
            panDirection *= -1; // Reverse direction
          }
        } else if (channel.name === 'Tilt') {
          channel.reference!.value += tiltDirection * 5; // Adjust Tilt value
          if (channel.reference!.value >= 255 || channel.reference!.value <= 0) {
            tiltDirection *= -1; // Reverse direction
          }
        }
      });
    });
  }, 100); // ~10fps
};


const chaos2 = () => {
  // dmx.showfileFixturesMapped
  if (animationIntervals['chaos2']) {
    clearInterval(animationIntervals['chaos2']);
    animationIntervals['chaos2'] = null;
    return;
  }

  animationIntervals['chaos2'] = setInterval(() => {
    dmx.showfileFixturesMapped.forEach(fixture => {
      fixture.def.channels.forEach(channel => {
        if (propertiesToAnimate.includes(channel.name)) {
          // Randomly set the channel value to a new value
          channel.reference!.value = Math.floor(Math.random() * 256);
        }
      });
    });
  }, 33); // ~30fps
};

const animationTest = () => {
  if (animationIntervals['test']) {
    clearInterval(animationIntervals['test']); // Clear any existing animation interval
    return;
  }
  // dim and brighten all channels in a loop
  let increasing = true;
  animationIntervals['test'] = setInterval(() => {
    dmx.showfileFixturesMapped.forEach(fixture => {
      fixture.def.channels.forEach(channel => {
        if (propertiesToAnimate.includes(channel.name)) {
          if (increasing) {
            channel.reference!.value += 5; // Increase value
            if (channel.reference!.value >= 255) {
              channel.reference!.value = 255; // Cap at max value
              increasing = false; // Switch to decreasing
            }
          } else {
            channel.reference!.value -= 5; // Decrease value
            if (channel.reference!.value <= 0) {
              channel.reference!.value = 0; // Cap at min value
              increasing = true; // Switch to increasing
            }
          }
        }
      });
    });
  }, 100); // ~10fps
};
</script>

<template>
  <q-toolbar>
    <q-btn
      icon="mdi-refresh"
      @click="reloadShowfile"
    >
      <q-tooltip>
        Reload Showfile
      </q-tooltip>
    </q-btn>
    <q-btn-dropdown label="Testing">
      <q-list>
        <q-item
          clickable
          v-close-popup
          @click="chaos"
        >
          <q-item-section>
            Chaos
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          @click="chaos2"
        >
          <q-item-section>
            Chaos 2
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          @click="clearAnimationIntervals"
        >
          <q-item-section>
            Clear Animations
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          @click="colorCycleAnimation"
        >
          <q-item-section>
            Color Cycle Animation
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          @click="lightFixtureSway"
        >
          <q-item-section>
            Light Fixture Sway
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          @click="maxValues"
        >
          <q-item-section>
            Max Values
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          @click="animationTest"
        >
          <q-item-section>
            Animation Test
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          @click="copyCurrentChannels"
        >
          <q-item-section>
            Copy Current Channels
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          @click="pasteChannels"
        >
          <q-item-section>
            Paste Channels
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-close-popup
          @click="copyFrames"
        >
          <q-item-section>
            Copy Current Frames
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-close-popup
          @click="pasteFrames"
        >
          <q-item-section>
            Paste Frames
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
    <q-btn @click="blackOut">Black Out</q-btn>
    <q-btn @click="showCueEditor = true" icon="timeline" color="secondary">
      Cue Editor
      <q-tooltip>Open Professional Cue Editor</q-tooltip>
    </q-btn>

    <!-- Widgets View Mode Toggle - only show when in widgets tab and groups exist -->
    <div v-if="ui.currentTab === 'widgets' && hasGroups" class="widgets-mode-toggle">
      <span class="mode-label">View:</span>
      <q-btn-group rounded unelevated>
        <q-btn
          @click="ui.widgetsViewMode = 'groups'"
          :class="{
            'bg-primary text-white': ui.widgetsViewMode === 'groups',
          }"
          icon="group_work"
          size="sm"
          dense
        >
          Groups
        </q-btn>
        <q-btn
          @click="ui.widgetsViewMode = 'individual'"
          :class="{
            'bg-primary text-white': ui.widgetsViewMode === 'individual',
          }"
          icon="widgets"
          size="sm"
          dense
        >
          Individual
        </q-btn>
      </q-btn-group>
    </div>

    <q-space />
    <ViewTypeToggle />
  </q-toolbar>

  <!-- Cue Editor Dialog -->
  <q-dialog
    v-model="showCueEditor"
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <CueEditor />
  </q-dialog>
</template>

<style scoped>
.widgets-mode-toggle {
  display: flex;
  align-items: center;
  gap: 8px;

  .mode-label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }
}
</style>
