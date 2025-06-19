<script setup lang="ts">
import { TestShowfile } from 'src/shows/TestShowfile';
import { useDMXStore } from 'src/stores/dmx';
import { useUIStore } from 'src/stores/ui';

const ui = useUIStore();
const dmx = useDMXStore();

let chaosInterval: ReturnType<typeof setInterval> | null = null;
let animationInterval: ReturnType<typeof setInterval> | null = null;

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

const copyCurrentChannels = () => {
    const channels = dmx.channels;
    copyToClipboard(JSON.stringify(channels));
}

const pasteChannels = () => {
    const data = prompt('Paste channels JSON data:');
    if (data) {
        try {
            const channels = JSON.parse(data);
            dmx.channels = channels;
        } catch (error) {
            console.error('Failed to parse JSON data: ', error);
        }
    }
}

const propertiesToAnimate = [
    'Red', 'Green', 'Blue',
    'Pan',
    'Tilt',
];

const chaos2 = () => {
// dmx.showfileFixturesMapped
if (chaosInterval) {
    clearInterval(chaosInterval);
    chaosInterval = null;
    return;
}

chaosInterval = setInterval(() => {
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
    if (animationInterval) {
        clearInterval(animationInterval); // Clear any existing animation interval
        return;
    }
    // dim and brighten all channels in a loop
    let increasing = true;
    animationInterval = setInterval(() => {
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
    <div>
        <button @click="reloadShowfile">Reload Showfile</button>
        <button @click="maxValues">Max Values</button>
        <button @click="blackOut">Black Out</button>
        <button @click="chaos">CHAOS</button>
        <button @click="chaos2">CHAOS 2</button>
        <button @click="animationTest">Animation Test</button>
        <button @click="copyCurrentChannels">Copy Current Channels</button>
        <button @click="pasteChannels">Paste Channels</button>

        <select v-model="ui.currentTab">
            <option value="channels">Channels</option>
            <option value="groups">Groups</option>
        </select>
    </div>
</template>

<style scoped></style>
