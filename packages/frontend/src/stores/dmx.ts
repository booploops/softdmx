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
} from '@softdmx/engine';
import type { ShowDocument } from '@softdmx/engine';
import { validateShowDocument } from '@softdmx/engine';
import { getFixtureDefinition, getAllFixtures } from 'src/fixture-library/registry';
import { resolveFixtureChannelsForMode } from '@softdmx/engine';
import { buildChannelMap } from '@softdmx/engine';
import { useIOClient } from 'src/lib/io-client';

export const useDMXStore = defineStore('dmx', () => {
  const baseChannels = shallowRef<ActiveChannel[]>([]);
  const channels = ref<ActiveChannel[]>([]);
  const showDocument = ref<ShowDocument | null>(null);

  const Fixtures = computed(() => getAllFixtures());

  const showfile = computed(() => {
    if (!showDocument.value) return undefined;
    return {
      name: showDocument.value.meta.name,
      fixtures: showDocument.value.fixtures,
      groups: showDocument.value.groups,
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

  function rebuildFromShow(doc: ShowDocument) {
    showDocument.value = doc;
    const built = buildChannelMap(doc);
    baseChannels.value = built.map((ch) => ({ ...ch }));
    channels.value = built.map((ch) => ({ ...ch }));
  }

  function applyMergedOutput(merged: ActiveChannel[]) {
    const baseByPath = new Map(baseChannels.value.map((channel) => [channel.path, channel]));
    const normalized = merged.map((channel) => {
      const base = baseByPath.get(channel.path);
      if (!base) return channel;
      return {
        ...channel,
        id: typeof channel.id === 'number' && channel.id > 0 ? channel.id : base.id,
        universe: channel.universe ?? base.universe,
        attributeType: channel.attributeType ?? base.attributeType,
      };
    });

    const current = channels.value;
    if (
      current.length === normalized.length &&
      current.every(
        (ch, i) =>
          ch.path === normalized[i]?.path &&
          ch.value === normalized[i]?.value &&
          ch.id === normalized[i]?.id &&
          ch.universe === normalized[i]?.universe
      )
    ) {
      return;
    }

    channels.value = normalized;
    useIOClient().emit('channels:state', normalized);
  }

  const getChannelByPath = (path: string): ActiveChannel | undefined => {
    return channels.value.find((channel) => channel.path === path);
  };

  const getFixtureDefinitionById = (fixtureId: string): FixtureDefinition | undefined => {
    return getFixtureDefinition(fixtureId);
  };

  /** @deprecated Use show store loadShow */
  function loadShowfile(doc: ShowDocument | { name: string; fixtures: ShowDocument['fixtures']; linkedGroups?: { name: string; names: string[] }[] }) {
    if ('version' in doc) {
      rebuildFromShow(validateShowDocument(doc));
      return;
    }
    rebuildFromShow(
      validateShowDocument({
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
      })
    );
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
