<script setup lang="ts">
import { useDMXStore } from 'src/stores/dmx';
import type { ShowfileFixtureMapped, ShowfileLinkedGroup } from 'src/types';

const dmx = useDMXStore();
const props = defineProps<{
    group: ShowfileLinkedGroup;
}>();

const controlChannel = ref<ShowfileFixtureMapped>()

const allChannels = computed(() => {
    return dmx.showfileFixturesMapped.filter(
        (fixture) => props.group.names.includes(fixture.fixtureName)
    );
})

const firstChannel = computed(() => {
    return allChannels.value.length > 0 ? allChannels.value[0] : null;
})

watch(firstChannel, (newChannel) => {
    if (!newChannel) return;
    controlChannel.value = JSON.parse(JSON.stringify(newChannel));
}, {
    immediate: true,
})

watch(controlChannel, (newControlChannel) => {
    if (!newControlChannel) return;
    // Update the references in the group
    allChannels.value.forEach((fix) => {
        fix.def.channels.forEach((channel: { reference: { value: number; }; }, index: string | number) => {
            // @ts-ignore
            channel.reference.value = newControlChannel.def.channels[index].reference.value;
        });
    });
}, { immediate: true, deep: true });

</script>

<template>
    <div class="fixture-channel-widget">
        <div>
            {{ group.name }}
        </div>
        <div v-if="controlChannel">
            <template v-for="channel in controlChannel.def.channels">
                <div class="channel-widget">
                    <div class="channel-name">
                        {{ channel.name }}
                    </div>
                    <div class="channel-control">
                        <div>
                            <input
                                type="range"
                                min="0"
                                max="255"
                                v-model="channel.reference.value"
                            />
                        </div>
                        <div>
                            {{ Math.floor(channel.reference.value) }}
                        </div>
                    </div>
                </div>
            </template>

        </div>
    </div>
</template>

<style scoped>
.channel-widget {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 12px;
}

.channel-name {
    font-weight: bold;
    margin-bottom: 4px;
}

.channel-reference {
    margin-bottom: 8px;
    text-align: center;
}

.fixture-channel-widget {
    user-select: none;

    border: 1px solid #eee;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
    /* dont shrink under a flex parent */
    flex-shrink: 0;
    overflow: hidden;
    overflow-y: scroll;

    div {
        margin-bottom: 8px;
    }

    input[type="range"] {
        width: 100%;
    }
}

.channel-control {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 8px;

    input[type="range"] {
        flex-grow: 1;
        height: 8px;
        -webkit-appearance: none;
        background: #ddd;
        border-radius: 4px;
        outline: none;

        &::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            background: #4CAF50;
            border-radius: 50%;
            cursor: pointer;
            transition: background .2s;

            &:hover {
                background: #45a049;
            }
        }

        &::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: #4CAF50;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            transition: background .2s;

            &:hover {
                background: #45a049;
            }
        }
    }

    div:first-child {
        min-width: 30px;
        text-align: left;
    }

    div:last-child {
        min-width: 30px;
        text-align: right;
    }
}
</style>
