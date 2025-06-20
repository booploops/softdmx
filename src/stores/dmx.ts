import { ref, shallowRef, computed, watch } from "vue";
import { defineStore } from "pinia";
import type {
  ActiveChannel,
  FixtureDefinition,
  FixtureChannelDefinition,
  Showfile,
  FixtureChannelWithReference,
  ShowfileFixtureMapped,
} from "src/types";
import { VRSL_Spotlight } from "src/fixtures/VRSL_Spotlight";
import { VRSL_Light5CH } from "src/fixtures/VRSL_Light5CH";
import { useIOClient } from "src/lib/io-client";

export const useDMXStore = defineStore("dmx", () => {
  /**
   * Fixtures that are available for Showfiles to use
   */
  const Fixtures = ref<FixtureDefinition[]>([VRSL_Spotlight, VRSL_Light5CH]);
  const showfile = ref<Showfile>();
  const channels = ref<ActiveChannel[]>([]);

  const showfileFixtures = computed(() => {
    return showfile.value?.fixtures;
  });

  const showfileFixturesMapped = computed<ShowfileFixtureMapped[]>(() => {
    if (!showfile.value || !showfileFixtures.value) return [];

    return showfileFixtures.value.map((fixture) => {
      const fixtureDefinition = Fixtures.value.find(
        (f) => f.id === fixture.fixtureId
      );

      if (!fixtureDefinition) {
        throw new Error(
          `Fixture definition not found for ${fixture.fixtureId}`
        );
      }

      // @ts-ignore TODO: Fix this type issue
      const channelsWithReferences: FixtureChannelWithReference[] =
        fixtureDefinition.channels.map((channel, index) => ({
          ...channel,
          reference: channels.value.find(
            (c) => c.path === `show://${fixture.name}/${index + 1}`
          ) ?? {
            id: index + 1,
            path: `show://${fixture.name}/${index + 1}`,
          },
        }));

      return {
        fixtureName: fixture.name,
        def: {
          ...fixtureDefinition,
          channels: channelsWithReferences,
        },
      } as ShowfileFixtureMapped;
    });
  });

  const getChannelByPath = (path: string): ActiveChannel | undefined => {
    return channels.value.find((channel) => channel.path === path);
  };

  const getFixtureDefinitionByPath = (
    path: string
  ): FixtureDefinition | undefined => {
    const fixtureName = path.split("/")[1]; // Extract fixture name from path
    return Fixtures.value.find((fixture) => fixture.name === fixtureName);
  };

  const getFixtureDefinition = (fixtureId: string) => {
    return Fixtures.value.find((fixture) => fixture.id === fixtureId);
  };

  const loadShowfile = (newShowfile: Showfile) => {
    showfile.value = newShowfile;
    channels.value = [];

    if (!showfile.value) return;

    let channelIndex = 1; // Keep track of overall channel count

    showfile.value.fixtures.forEach((fixture) => {
      const fixtureDefinition = getFixtureDefinition(fixture.fixtureId);
      if (!fixtureDefinition) return;

      for (let i = 0; i < fixtureDefinition.channels.length; i++) {
        channels.value.push({
          id: channelIndex,
          path: `show://${fixture.name}/${i + 1}`,
          value: fixtureDefinition.channels[i]?.defaultValue ?? 0,
        });
        channelIndex++;
      }
    });
  };

  watch(channels, (newChannels) => {
    useIOClient().emit("channels:update", newChannels);
  }, { deep: true });

  return {
    channels,
    showfile,
    Fixtures,
    loadShowfile,
    getFixtureDefinition,
    showfileFixtures,
    showfileFixturesMapped,
    getChannelByPath,
    getFixtureDefinitionByPath,
  };
});
