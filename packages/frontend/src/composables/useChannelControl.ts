/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useScratchStore } from 'src/stores/scratch';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useDMXStore } from 'src/stores/dmx';
import { useSelectionStore } from 'src/stores/selection';
import { inferAttributeFeature } from '@softdmx/engine';

export function useChannelControl() {
  const scratch = useScratchStore();
  const engine = useOutputEngineStore();
  const dmx = useDMXStore();
  const selection = useSelectionStore();

  type GroupPath = { groupName: string; attributeName: string };
  type FixturePath = { fixtureName: string; channelIndex: number };
  type ScratchChannelUpdate = {
    path: string;
    value: number;
    attributeType: string;
    attributeName?: string;
    attributeId?: string;
    feature?: import('@softdmx/engine').AttributeFeature;
  };

  function parseGroupPath(path: string): GroupPath | null {
    if (!path.startsWith('group://')) return null;
    const raw = path.slice('group://'.length);
    const splitAt = raw.indexOf('/');
    if (splitAt < 0) return null;

    const encodedGroup = raw.slice(0, splitAt);
    const encodedAttr = raw.slice(splitAt + 1);
    if (!encodedGroup || !encodedAttr) return null;

    return {
      groupName: decodeURIComponent(encodedGroup),
      attributeName: decodeURIComponent(encodedAttr),
    };
  }

  function parseFixturePath(path: string): FixturePath | null {
    if (!path.startsWith('show://')) return null;
    const raw = path.slice('show://'.length);
    const splitAt = raw.lastIndexOf('/');
    if (splitAt < 0) return null;

    const fixtureName = raw.slice(0, splitAt);
    const channelPart = raw.slice(splitAt + 1);
    const channelIndex = parseInt(channelPart, 10);
    if (!fixtureName || Number.isNaN(channelIndex) || channelIndex <= 0) return null;

    return {
      fixtureName,
      channelIndex: channelIndex - 1,
    };
  }

  function resolveAttributeFromPath(path: string): string | null {
    const groupPath = parseGroupPath(path);
    if (groupPath) return groupPath.attributeName;

    const fixturePath = parseFixturePath(path);
    if (!fixturePath) return null;

    const mapped = dmx.showfileFixturesMapped.find((f) => f.fixtureName === fixturePath.fixtureName);
    return mapped?.def.channels[fixturePath.channelIndex]?.name ?? null;
  }

  function getSelectionFixtureNames(): string[] {
    const show = dmx.showDocument;
    if (!show) return [];

    const names = new Set<string>();
    for (const fixture of selection.selectedFixtures) {
      names.add(fixture);
    }
    for (const groupName of selection.selectedGroups) {
      const group = show.groups.find((g) => g.name === groupName);
      if (!group) continue;
      for (const fixtureName of group.fixtures) {
        names.add(fixtureName);
      }
    }
    return Array.from(names);
  }

  function getScopedSelectionUpdates(path: string, value: number): ScratchChannelUpdate[] {
    if (!selection.hasSelection) return [];

    const attributeName = resolveAttributeFromPath(path);
    if (!attributeName) return [];

    const fixtures = getSelectionFixtureNames();
    if (fixtures.length === 0) return [];

    const updates: ScratchChannelUpdate[] = [];
    for (const fixtureName of fixtures) {
      const mapped = dmx.showfileFixturesMapped.find((f) => f.fixtureName === fixtureName);
      if (!mapped) continue;
      const channel = mapped.def.channels.find((c) => c.name === attributeName);
      if (!channel?.reference?.path) continue;
      const feature = inferAttributeFeature(channel.type, channel.name);
      updates.push({
        path: channel.reference.path,
        value,
        attributeType: channel.type,
        attributeName: channel.name,
        attributeId: channel.attributeId ?? channel.name,
        feature,
      });
    }
    return updates;
  }

  function setScratchChannel(
    path: string,
    value: number,
    attributeType = 'generic',
    meta?: Pick<ScratchChannelUpdate, 'attributeName' | 'attributeId' | 'feature'>
  ) {
    scratch.setChannel(path, Math.round(value), attributeType, meta);
  }

  function setChannel(path: string, value: number, attributeType = 'generic') {
    const scopedUpdates = getScopedSelectionUpdates(path, value);
    if (scopedUpdates.length > 0) {
      scratch.setChannels(scopedUpdates);
      engine.requestMerge();
      return;
    }

    const groupPath = parseGroupPath(path);
    if (groupPath) {
      setGroupChannels(groupPath.groupName, { [groupPath.attributeName]: value });
      return;
    }

    const fixturePath = parseFixturePath(path);
    if (fixturePath) {
      const mapped = dmx.showfileFixturesMapped.find((f) => f.fixtureName === fixturePath.fixtureName);
      const channel = mapped?.def.channels[fixturePath.channelIndex];
      setScratchChannel(path, value, attributeType, channel
        ? {
            attributeName: channel.name,
            attributeId: channel.attributeId ?? channel.name,
            feature: inferAttributeFeature(channel.type, channel.name),
          }
        : undefined);
      engine.requestMerge();
      return;
    }

    setScratchChannel(path, value, attributeType);
    engine.requestMerge();
  }

  function setChannelByFixture(fixtureName: string, channelIndex: number, value: number, attributeType = 'generic') {
    setChannel(`show://${fixtureName}/${channelIndex}`, value, attributeType);
  }

  function setGroupChannels(groupName: string, attrs: Record<string, number>) {
    const show = dmx.showDocument;
    if (!show) return;

    if (selection.hasSelection) {
      const scopedUpdates: ScratchChannelUpdate[] = [];
      for (const [attributeName, value] of Object.entries(attrs)) {
        scopedUpdates.push(
          ...getScopedSelectionUpdates(
            `group://${encodeURIComponent(groupName)}/${encodeURIComponent(attributeName)}`,
            value
          )
        );
      }
      if (scopedUpdates.length > 0) {
        scratch.setChannels(scopedUpdates);
        engine.requestMerge();
        return;
      }
    }

    const group = show.groups.find((g) => g.name === groupName);
    if (!group) return;

    const updates: { path: string; value: number; attributeType: string }[] = [];
    for (const fixtureName of group.fixtures) {
      const mapped = dmx.showfileFixturesMapped.find((f) => f.fixtureName === fixtureName);
      if (!mapped) continue;

      for (const [attrName, value] of Object.entries(attrs)) {
        const channel = mapped.def.channels.find((c) => c.name === attrName);
        if (channel?.reference) {
          updates.push({
            path: channel.reference.path,
            value,
            attributeType: channel.type,
            attributeName: channel.name,
            attributeId: channel.attributeId ?? channel.name,
            feature: inferAttributeFeature(channel.type, channel.name),
          });
        }
      }
    }

    if (updates.length > 0) {
      scratch.setChannels(updates);
    }
    engine.requestMerge();
  }

  function getSingleChannelDisplayValue(path: string): number {
    const scratchEntry = scratch.getChannel(path);
    if (scratchEntry) return scratchEntry.value;
    return dmx.getChannelByPath(path)?.value ?? 0;
  }

  function getGroupDisplayValue(groupName: string, attributeName: string): number {
    const show = dmx.showDocument;
    if (!show) return 0;

    const group = show.groups.find((g) => g.name === groupName);
    if (!group) return 0;

    for (const fixtureName of group.fixtures) {
      const mapped = dmx.showfileFixturesMapped.find((f) => f.fixtureName === fixtureName);
      const channel = mapped?.def.channels.find((c) => c.name === attributeName);
      if (channel?.reference?.path) {
        return getSingleChannelDisplayValue(channel.reference.path);
      }
    }

    return 0;
  }

  function getDisplayValue(path: string): number {
    const groupPath = parseGroupPath(path);
    if (groupPath) {
      return getGroupDisplayValue(groupPath.groupName, groupPath.attributeName);
    }

    return getSingleChannelDisplayValue(path);
  }

  function clearScratch() {
    scratch.clear();
    engine.requestMerge();
  }

  return {
    setChannel,
    setChannelByFixture,
    setGroupChannels,
    getDisplayValue,
    clearScratch,
  };
}
