/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref, computed, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import type {
  ActiveChannel,
  FixtureDefinition,
  FixtureChannelWithReference,
  ShowfileFixtureMapped,
} from 'src/types';
import type { ShowDocumentV1 } from 'src/types/show-document';
import { getFixtureDefinition, getAllFixtures } from 'src/plugins/registry';
import { resolveFixtureChannelsForMode } from 'src/plugins/gdtf/gdtf-to-fixture';
import { buildChannelMap } from 'src/engine/preset-resolver';
import { useIOClient } from 'src/lib/io-client';

export const useDMXStore = defineStore('dmx', () => {
  const baseChannels = shallowRef<ActiveChannel[]>([]);
  const channels = ref<ActiveChannel[]>([]);
  const showDocument = ref<ShowDocumentV1 | null>(null);

  const Fixtures = computed(() => getAllFixtures());

  const showfile = computed(() => {
    if (!showDocument.value) return undefined;
    return {
      name: showDocument.value.meta.name,
      fixtures: showDocument.value.fixtures,
      linkedGroups: showDocument.value.groups.map((g) => ({
        name: g.name,
        names: g.fixtures,
      })),
    };
  });

  const showfileFixtures = computed(() => showDocument.value?.fixtures);

  const showfileFixturesMapped = computed<ShowfileFixtureMapped[]>(() => {
    if (!showDocument.value) return [];

    return showDocument.value.fixtures.map((fixture) => {
      const fixtureDefinition = getFixtureDefinition(fixture.fixtureId);
      if (!fixtureDefinition) return null;

      const modeChannels = resolveFixtureChannelsForMode(fixtureDefinition, fixture.modeId);
      const channelsWithReferences: FixtureChannelWithReference[] = modeChannels.map((channel, index) => ({
        ...channel,
        reference: {
          id: index + 1,
          path: `show://${fixture.name}/${index + 1}`,
          value: channel.defaultValue,
          attributeType: channel.type,
        },
      }));

      return {
        fixtureName: fixture.name,
        def: {
          ...fixtureDefinition,
          channels: channelsWithReferences,
        },
      } as ShowfileFixtureMapped;
    }).filter((f): f is ShowfileFixtureMapped => f !== null);
  });

  function rebuildFromShow(doc: ShowDocumentV1) {
    showDocument.value = doc;
    const built = buildChannelMap(doc);
    baseChannels.value = built.map((ch) => ({ ...ch }));
    channels.value = built.map((ch) => ({ ...ch }));
    useIOClient().emit('show:state', doc);
  }

  function applyMergedOutput(merged: ActiveChannel[]) {
    const current = channels.value;
    if (
      current.length === merged.length &&
      current.every(
        (ch, i) => ch.path === merged[i]?.path && ch.value === merged[i]?.value
      )
    ) {
      return;
    }

    channels.value = merged;
    useIOClient().emit('channels:state', merged);
  }

  const getChannelByPath = (path: string): ActiveChannel | undefined => {
    return channels.value.find((channel) => channel.path === path);
  };

  const getFixtureDefinitionById = (fixtureId: string): FixtureDefinition | undefined => {
    return getFixtureDefinition(fixtureId);
  };

  /** @deprecated Use show store loadShow */
  function loadShowfile(doc: ShowDocumentV1 | { name: string; fixtures: ShowDocumentV1['fixtures']; linkedGroups?: { name: string; names: string[] }[] }) {
    if ('version' in doc) {
      rebuildFromShow(doc as ShowDocumentV1);
      return;
    }
    const migrated: ShowDocumentV1 = {
      version: '1.1',
      meta: { name: doc.name, created: new Date().toISOString(), modified: new Date().toISOString() },
      destinations: [
        { id: 'default-gridnode', name: 'Default GridNode Overlay', type: 'gridnode', settings: {} },
      ],
      fixtures: doc.fixtures,
      groups: (doc.linkedGroups ?? []).map((g) => ({ name: g.name, fixtures: g.names })),
      presets: [],
      effects: [],
      cues: [],
      bindings: { midi: [], osc: [] },
      audioMappings: [],
      executors: [],
      submasters: [],
    };
    rebuildFromShow(migrated);
  }

  return {
    baseChannels,
    channels,
    showDocument,
    Fixtures,
    showfile,
    showfileFixtures,
    showfileFixturesMapped,
    rebuildFromShow,
    applyMergedOutput,
    getChannelByPath,
    getFixtureDefinition: getFixtureDefinitionById,
    loadShowfile,
  };
});
