/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';

export interface GdtfParseResult {
  descriptionXml: string;
  fileName: string;
  root: Record<string, unknown>;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function getFixtureTypeNode(root: Record<string, unknown>): Record<string, unknown> {
  const gdtf = root.GDTF as Record<string, unknown> | undefined;
  const fixtureType = gdtf?.FixtureType as Record<string, unknown> | undefined;
  if (!fixtureType) {
    throw new Error('Invalid GDTF: missing FixtureType');
  }
  return fixtureType;
}

export function parseGdtfArchive(bytes: Uint8Array, fileName = 'fixture.gdtf'): GdtfParseResult {
  const entries = unzipSync(bytes);
  const descriptionKey = Object.keys(entries).find((key) => key.endsWith('description.xml'));
  if (!descriptionKey) {
    throw new Error('Invalid GDTF: description.xml not found');
  }

  const descriptionXml = new TextDecoder().decode(entries[descriptionKey]!);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    parseTagValue: false,
  });
  const root = parser.parse(descriptionXml) as Record<string, unknown>;
  return { descriptionXml, fileName, root };
}

export function readGdtfAttributes(fixtureType: Record<string, unknown>) {
  const attributeDefinitions = fixtureType.AttributeDefinitions as Record<string, unknown> | undefined;
  const attributesRoot = attributeDefinitions?.Attributes as Record<string, unknown> | undefined;
  return asArray(attributesRoot?.Attribute as Record<string, unknown> | Record<string, unknown>[] | undefined);
}

export function readGdtfWheels(fixtureType: Record<string, unknown>) {
  const wheelsRoot = fixtureType.Wheels as Record<string, unknown> | undefined;
  return asArray(wheelsRoot?.Wheel as Record<string, unknown> | Record<string, unknown>[] | undefined);
}

export function readGdtfModes(fixtureType: Record<string, unknown>) {
  const modesRoot = fixtureType.DMXModes as Record<string, unknown> | undefined;
  return asArray(modesRoot?.DMXMode as Record<string, unknown> | Record<string, unknown>[] | undefined);
}

export function readGdtfChannels(mode: Record<string, unknown>) {
  const channelsRoot = mode.DMXChannels as Record<string, unknown> | undefined;
  return asArray(channelsRoot?.DMXChannel as Record<string, unknown> | Record<string, unknown>[] | undefined);
}

export function getFixtureTypeFromRoot(root: Record<string, unknown>) {
  return getFixtureTypeNode(root);
}

export function readWheelSlots(wheel: Record<string, unknown>): string[] {
  const slotsRoot = wheel.Slot as Record<string, unknown> | Record<string, unknown>[] | undefined;
  return asArray(slotsRoot).map((slot, index) => {
    const name = slot['@_Name'];
    return typeof name === 'string' && name.trim() ? name.trim() : `Slot ${index + 1}`;
  });
}

export function parseDmxFraction(value: string | undefined): number {
  if (!value) return 0;
  const [wholeRaw, fractionRaw] = value.split('/');
  const whole = Number(wholeRaw);
  const fraction = Number(fractionRaw ?? '1');
  if (!Number.isFinite(whole) || !Number.isFinite(fraction) || fraction <= 0) return 0;
  return Math.round((whole / fraction) * 255);
}

export function resolveChannelAttributeName(channel: Record<string, unknown>): string {
  const logicalChannels = asArray(
    channel.LogicalChannel as Record<string, unknown> | Record<string, unknown>[] | undefined
  );
  const logical = logicalChannels[0];
  if (!logical) return 'Channel';

  const attr = logical['@_Attribute'];
  if (typeof attr === 'string' && attr.trim()) return attr.trim();

  const functions = asArray(
    logical.ChannelFunction as Record<string, unknown> | Record<string, unknown>[] | undefined
  );
  const fnAttr = functions[0]?.['@_Attribute'];
  if (typeof fnAttr === 'string' && fnAttr.trim()) return fnAttr.trim();

  return 'Channel';
}

export function readChannelSets(logical: Record<string, unknown>) {
  const functions = asArray(
    logical.ChannelFunction as Record<string, unknown> | Record<string, unknown>[] | undefined
  );
  const sets: Array<{ name: string; dmxFrom: number; dmxTo: number; wheel?: string }> = [];

  for (const fn of functions) {
    const channelSets = asArray(fn.ChannelSet as Record<string, unknown> | Record<string, unknown>[] | undefined);
    for (const set of channelSets) {
      sets.push({
        name: typeof set['@_Name'] === 'string' ? set['@_Name'] : 'Slot',
        dmxFrom: parseDmxFraction(typeof set['@_DMXFrom'] === 'string' ? set['@_DMXFrom'] : '0/1'),
        dmxTo: 255,
        wheel: typeof set['@_Wheel'] === 'string' ? set['@_Wheel'] : undefined,
      });
    }
  }

  return sets;
}
