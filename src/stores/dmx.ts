/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ref, shallowRef, computed, watch } from "vue";
import { defineStore } from "pinia";
import * as YAML from "yaml";
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

  // YAML Import/Export Functions
  const exportShowfileAsYAML = (): string => {
    if (!showfile.value) {
      throw new Error("No showfile loaded to export");
    }

    // Create a clean copy for export (remove any runtime data)
    const exportData: Showfile = {
      name: showfile.value.name,
      fixtures: showfile.value.fixtures.map(fixture => ({
        name: fixture.name,
        fixtureId: fixture.fixtureId
      })),
      linkedGroups: showfile.value.linkedGroups || []
    };

    return YAML.stringify(exportData);
  };

  const exportShowfileWithMetadataAsYAML = (): string => {
    if (!showfile.value) {
      throw new Error("No showfile loaded to export");
    }

    const exportDate = new Date().toISOString();
    const availableFixtureTypes = Fixtures.value.map(f => f.id);

    // Create an extended export with metadata
    const exportData = {
      metadata: {
        exportedAt: exportDate,
        exportedBy: "SoftDMX",
        version: "1.0",
        availableFixtureTypes
      },
      showfile: {
        name: showfile.value.name,
        fixtures: showfile.value.fixtures.map(fixture => ({
          name: fixture.name,
          fixtureId: fixture.fixtureId
        })),
        linkedGroups: showfile.value.linkedGroups || []
      }
    };

    return YAML.stringify(exportData);
  };

  const downloadShowfileAsYAML = (filename?: string, includeMetadata = false) => {
    try {
      const yamlContent = includeMetadata ? exportShowfileWithMetadataAsYAML() : exportShowfileAsYAML();
      const blob = new Blob([yamlContent], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `${showfile.value?.name || 'showfile'}.yml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Failed to download showfile:', error);
      return false;
    }
  };

  const importShowfileFromYAML = (yamlContent: string): Showfile => {
    try {
      const parsed = YAML.parse(yamlContent);

      // Check if this is an extended format with metadata
      let showfileData: Showfile;
      if (parsed.metadata && parsed.showfile) {
        // Extended format
        showfileData = parsed.showfile as Showfile;
        console.log('Importing extended format showfile exported at:', parsed.metadata.exportedAt);
      } else {
        // Simple format
        showfileData = parsed as Showfile;
      }

      // Validate the parsed showfile structure
      if (!showfileData.name || !Array.isArray(showfileData.fixtures)) {
        throw new Error("Invalid showfile format: missing name or fixtures");
      }

      // Validate each fixture
      for (const fixture of showfileData.fixtures) {
        if (!fixture.name || !fixture.fixtureId) {
          throw new Error(`Invalid fixture: missing name or fixtureId`);
        }

        // Check if the fixture definition exists
        const fixtureDefinition = getFixtureDefinition(fixture.fixtureId);
        if (!fixtureDefinition) {
          console.warn(`Unknown fixture type: ${fixture.fixtureId} - skipping validation`);
          // Don't throw error, just warn - this allows importing showfiles with newer fixture types
        }
      }

      // Validate linked groups if they exist
      if (showfileData.linkedGroups) {
        for (const group of showfileData.linkedGroups) {
          if (!group.name || !Array.isArray(group.names)) {
            throw new Error(`Invalid linked group: missing name or names array`);
          }

          // Check if all referenced fixtures exist
          for (const fixtureName of group.names) {
            const fixtureExists = showfileData.fixtures.some(f => f.name === fixtureName);
            if (!fixtureExists) {
              throw new Error(`Linked group "${group.name}" references unknown fixture "${fixtureName}"`);
            }
          }
        }
      }

      return showfileData;
    } catch (error) {
      console.error('Failed to parse YAML showfile:', error);
      throw new Error(`Failed to import showfile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const loadShowfileFromYAML = (yamlContent: string): boolean => {
    try {
      const importedShowfile = importShowfileFromYAML(yamlContent);
      loadShowfile(importedShowfile);
      return true;
    } catch (error) {
      console.error('Failed to load showfile from YAML:', error);
      return false;
    }
  };

  const loadShowfileFromFile = (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          if (!content) {
            throw new Error("File is empty or could not be read");
          }

          const success = loadShowfileFromYAML(content);
          resolve(success);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
  };

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
    // YAML Import/Export
    exportShowfileAsYAML,
    exportShowfileWithMetadataAsYAML,
    downloadShowfileAsYAML,
    importShowfileFromYAML,
    loadShowfileFromYAML,
    loadShowfileFromFile,
  };
});
