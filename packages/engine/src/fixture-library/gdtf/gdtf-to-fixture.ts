/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { AttributeDefinition, FixtureModeDefinition } from "../../types/attributes";
import type {
  FixtureChannelDefinition,
  FixtureDefinition,
  WidgetConfiguration,
} from "../../types/fixture";
import {
  getFixtureTypeFromRoot,
  parseGdtfArchive,
  readChannelSets,
  readGdtfAttributes,
  readGdtfChannels,
  readGdtfModes,
  readGdtfWheels,
  readWheelSlots,
  resolveChannelAttributeName,
  type GdtfParseResult,
} from "./parse-gdtf.ts";
import {
  inferMergeForFeature,
  mapGdtfFeatureToAttributeFeature,
  sanitizeFixtureId,
  sanitizeModeId,
} from "./feature-map.ts";

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function mapPhysicalUnitToChannelType(feature: string, attributeName: string): string {
  const mapped = mapGdtfFeatureToAttributeFeature(feature, attributeName);
  if (mapped === "dimmer") return "intensity";
  if (mapped === "color") return "color";
  if (mapped === "position") return "position";
  if (mapped === "beam" || mapped === "shutter") return "effect";
  return "generic";
}

function buildAttributeMap(fixtureType: Record<string, unknown>): Map<string, AttributeDefinition> {
  const attributes = new Map<string, AttributeDefinition>();
  for (const attr of readGdtfAttributes(fixtureType)) {
    const name = typeof attr["@_Name"] === "string" ? attr["@_Name"] : "Attribute";
    const featureRaw = typeof attr["@_Feature"] === "string" ? attr["@_Feature"] : name;
    const feature = mapGdtfFeatureToAttributeFeature(featureRaw, name);
    attributes.set(name, {
      id: name,
      feature,
      merge: inferMergeForFeature(feature),
      channelName: name,
    });
  }
  return attributes;
}

function buildWheelLabelMap(fixtureType: Record<string, unknown>): Map<string, string[]> {
  const wheelLabels = new Map<string, string[]>();
  for (const wheel of readGdtfWheels(fixtureType)) {
    const wheelName = typeof wheel["@_Name"] === "string" ? wheel["@_Name"] : "Wheel";
    wheelLabels.set(wheelName, readWheelSlots(wheel));
  }
  return wheelLabels;
}

function buildModeChannels(
  mode: Record<string, unknown>,
  attributeMap: Map<string, AttributeDefinition>,
  wheelLabels: Map<string, string[]>,
): FixtureChannelDefinition[] {
  const channels: FixtureChannelDefinition[] = [];

  for (const dmxChannel of readGdtfChannels(mode)) {
    const offsetRaw = dmxChannel["@_Offset"];
    const offset =
      typeof offsetRaw === "string" ? Number(offsetRaw.split(",")[0]) : channels.length + 1;
    const attributeName = resolveChannelAttributeName(dmxChannel);
    const attribute = attributeMap.get(attributeName);
    const featureRaw =
      attribute?.feature ?? mapGdtfFeatureToAttributeFeature(undefined, attributeName);
    const type = mapPhysicalUnitToChannelType(featureRaw, attributeName);

    const logicalChannels = asArray(
      dmxChannel.LogicalChannel as Record<string, unknown> | Record<string, unknown>[] | undefined,
    );
    const channelSets = logicalChannels[0] ? readChannelSets(logicalChannels[0]) : [];
    const wheelName = channelSets.find((set) => set.wheel)?.wheel;
    const wheelSlots = wheelName ? wheelLabels.get(wheelName) : undefined;

    const channel: FixtureChannelDefinition = {
      name: attributeName,
      type,
      minValue: 0,
      maxValue: 255,
      defaultValue: 0,
      attributeId: attributeName,
      dmxOffset: offset,
    };

    if (wheelSlots && wheelSlots.length >= 2) {
      channel.controlMode = "indexed";
      channel.indexedSlots = wheelSlots.length;
      channel.indexedLabels = wheelSlots;
    } else if (channelSets.length >= 2) {
      channel.controlMode = "indexed";
      channel.indexedSlots = channelSets.length;
      channel.indexedLabels = channelSets.map((set) => set.name);
    }

    channels.push(channel);
  }

  return channels.sort((a, b) => (a.dmxOffset ?? 0) - (b.dmxOffset ?? 0));
}

function buildWidgets(channels: FixtureChannelDefinition[]): WidgetConfiguration[] {
  const widgets: WidgetConfiguration[] = [];
  const byName = new Map(channels.map((channel) => [channel.name, channel]));

  const dimmer = [...byName.entries()].find(([, channel]) => channel.type === "intensity");
  if (dimmer) {
    widgets.push({
      type: "dimmerSlider",
      name: "Intensity",
      channels: { dimmerChannel: dimmer[0] },
    });
  }

  const red = byName.get("ColorAdd_R") ?? byName.get("Red");
  const green = byName.get("ColorAdd_G") ?? byName.get("Green");
  const blue = byName.get("ColorAdd_B") ?? byName.get("Blue");
  if (red && green && blue) {
    widgets.push({
      type: "colorPicker",
      name: "Color",
      channels: {
        redChannel: red.name,
        greenChannel: green.name,
        blueChannel: blue.name,
      },
    });
  }

  const pan = byName.get("Pan");
  const tilt = byName.get("Tilt");
  if (pan && tilt) {
    widgets.push({
      type: "lightMover",
      name: "Position",
      channels: {
        panChannel: pan.name,
        tiltChannel: tilt.name,
      },
    });
  }

  return widgets;
}

export function gdtfParseResultToFixture(
  result: GdtfParseResult,
  preferredModeIndex = 0,
): FixtureDefinition {
  const fixtureType = getFixtureTypeFromRoot(result.root);
  const fixtureName =
    typeof fixtureType["@_Name"] === "string" ? fixtureType["@_Name"] : "Imported Fixture";
  const fixtureTypeId =
    typeof fixtureType["@_FixtureTypeID"] === "string"
      ? fixtureType["@_FixtureTypeID"]
      : sanitizeFixtureId(fixtureName);

  const attributeMap = buildAttributeMap(fixtureType);
  const wheelLabels = buildWheelLabelMap(fixtureType);
  const modes: FixtureModeDefinition[] = [];
  const modeChannels = new Map<string, FixtureChannelDefinition[]>();

  readGdtfModes(fixtureType).forEach((mode, index) => {
    const modeName = typeof mode["@_Name"] === "string" ? mode["@_Name"] : `Mode ${index + 1}`;
    const modeId = sanitizeModeId(modeName, index);
    const channels = buildModeChannels(mode, attributeMap, wheelLabels);
    modeChannels.set(modeId, channels);
    modes.push({
      id: modeId,
      name: modeName,
      channelNames: channels.map((channel) => channel.name),
      channels,
    });
  });

  const defaultMode = modes[preferredModeIndex] ?? modes[0];
  const channels = defaultMode ? (modeChannels.get(defaultMode.id) ?? []) : [];
  const widgets = buildWidgets(channels);

  const fixture: FixtureDefinition = {
    id: sanitizeFixtureId(fixtureTypeId),
    name: fixtureName,
    channels,
    attributes: [...attributeMap.values()],
    modes,
    defaultModeId: defaultMode?.id,
    source: "gdtf",
    gdtfMeta: {
      fixtureTypeId,
      originalFileName: result.fileName,
      descriptionXml: result.descriptionXml,
    },
    ...(widgets.length > 0 ? { widgets } : {}),
  };

  return fixture;
}

export function loadFixtureFromGdtf(
  bytes: Uint8Array,
  fileName?: string,
  preferredModeIndex = 0,
): FixtureDefinition {
  const parsed = parseGdtfArchive(bytes, fileName);
  return gdtfParseResultToFixture(parsed, preferredModeIndex);
}

export function resolveFixtureChannelsForMode(
  fixture: FixtureDefinition,
  modeId?: string,
): FixtureChannelDefinition[] {
  if (!fixture.modes?.length) return fixture.channels;
  const selectedModeId = modeId ?? fixture.defaultModeId ?? fixture.modes[0]?.id;
  const mode = fixture.modes.find((entry) => entry.id === selectedModeId);
  if (mode?.channels?.length) return mode.channels;
  if (!mode) return fixture.channels;

  const byName = new Map(fixture.channels.map((channel) => [channel.name, channel]));
  const resolved = mode.channelNames
    .map((name) => byName.get(name))
    .filter((channel): channel is FixtureChannelDefinition => !!channel);

  return resolved.length > 0 ? resolved : fixture.channels;
}
