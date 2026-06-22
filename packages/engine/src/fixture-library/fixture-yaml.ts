/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as YAML from 'yaml';
import type { FixtureDefinition, FixtureChannelDefinition, WidgetConfiguration } from '../types/fixture';

export type PluginManifest = {
  id: string;
  version: string;
  fixtures: string[];
};

function ensureRecord(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${context} must be an object`);
  }
  return value as Record<string, unknown>;
}

function ensureString(value: unknown, context: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${context} must be a non-empty string`);
  }
  return value.trim();
}

function ensureNumber(value: unknown, context: number | string): number {
  const contextLabel = String(context);
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${contextLabel} must be a number`);
  }
  return value;
}

function validateChannel(channel: unknown, index: number): FixtureChannelDefinition {
  const obj = ensureRecord(channel, `channel[${index}]`);

  const minValue = ensureNumber(obj.minValue, `channel[${index}].minValue`);
  const maxValue = ensureNumber(obj.maxValue, `channel[${index}].maxValue`);
  const defaultValue = ensureNumber(obj.defaultValue, `channel[${index}].defaultValue`);

  if (maxValue < minValue) {
    throw new Error(`channel[${index}] maxValue must be >= minValue`);
  }
  if (defaultValue < minValue || defaultValue > maxValue) {
    throw new Error(`channel[${index}] defaultValue must be in range`);
  }

  let controlMode: FixtureChannelDefinition['controlMode'];
  if (obj.controlMode !== undefined) {
    const mode = ensureString(obj.controlMode, `channel[${index}].controlMode`);
    if (mode !== 'dmx' && mode !== 'indexed') {
      throw new Error(`channel[${index}].controlMode must be "dmx" or "indexed"`);
    }
    controlMode = mode;
  }

  let indexedSlots: number | undefined;
  if (obj.indexedSlots !== undefined) {
    indexedSlots = ensureNumber(obj.indexedSlots, `channel[${index}].indexedSlots`);
    if (!Number.isInteger(indexedSlots) || indexedSlots < 2) {
      throw new Error(`channel[${index}].indexedSlots must be an integer >= 2`);
    }
  }

  let indexedLabels: string[] | undefined;
  if (obj.indexedLabels !== undefined) {
    if (!Array.isArray(obj.indexedLabels)) {
      throw new Error(`channel[${index}].indexedLabels must be an array`);
    }
    indexedLabels = obj.indexedLabels.map((label, labelIndex) =>
      ensureString(label, `channel[${index}].indexedLabels[${labelIndex}]`)
    );
    if (indexedSlots !== undefined && indexedLabels.length !== indexedSlots) {
      throw new Error(`channel[${index}].indexedLabels length must match indexedSlots`);
    }
  }

  if (controlMode === 'indexed' && indexedSlots === undefined) {
    throw new Error(`channel[${index}] indexedSlots is required when controlMode is indexed`);
  }

  return {
    name: ensureString(obj.name, `channel[${index}].name`),
    type: ensureString(obj.type, `channel[${index}].type`),
    minValue,
    maxValue,
    defaultValue,
    ...(typeof obj.attributeId === 'string' ? { attributeId: obj.attributeId.trim() } : {}),
    ...(typeof obj.dmxOffset === 'number' ? { dmxOffset: obj.dmxOffset } : {}),
    ...(controlMode ? { controlMode } : {}),
    ...(indexedSlots !== undefined ? { indexedSlots } : {}),
    ...(indexedLabels ? { indexedLabels } : {}),
  };
}

function validateWidget(widget: unknown, index: number): WidgetConfiguration {
  const obj = ensureRecord(widget, `widget[${index}]`);
  const channelsRaw = ensureRecord(obj.channels, `widget[${index}].channels`);
  const channels: Record<string, string> = {};

  for (const [key, value] of Object.entries(channelsRaw)) {
    channels[key] = ensureString(value, `widget[${index}].channels.${key}`);
  }

  return {
    type: ensureString(obj.type, `widget[${index}].type`),
    name: ensureString(obj.name, `widget[${index}].name`),
    channels,
  };
}

export function loadFixtureYaml(source: string): FixtureDefinition {
  const parsed = YAML.parse(source) as unknown;
  const obj = ensureRecord(parsed, 'fixture');

  if (!Array.isArray(obj.channels) || obj.channels.length === 0) {
    throw new Error('fixture.channels must be a non-empty array');
  }

  const channels = obj.channels.map((channel, index) => validateChannel(channel, index));

  let widgets: WidgetConfiguration[] | undefined;
  if (obj.widgets !== undefined) {
    if (!Array.isArray(obj.widgets)) {
      throw new Error('fixture.widgets must be an array when provided');
    }
    widgets = obj.widgets.map((widget, index) => validateWidget(widget, index));
  }

  let attributes;
  if (obj.attributes !== undefined) {
    if (!Array.isArray(obj.attributes)) throw new Error('fixture.attributes must be an array');
    attributes = obj.attributes.map((attribute, index) => {
      const record = ensureRecord(attribute, `attributes[${index}]`);
      return {
        id: ensureString(record.id, `attributes[${index}].id`),
        feature: ensureString(record.feature, `attributes[${index}].feature`) as import('../types/attributes').AttributeFeature,
        merge: ensureString(record.merge, `attributes[${index}].merge`) as import('../types/attributes').AttributeMerge,
        channelName: ensureString(record.channelName, `attributes[${index}].channelName`),
      };
    });
  }

  let modes;
  if (obj.modes !== undefined) {
    if (!Array.isArray(obj.modes)) throw new Error('fixture.modes must be an array');
    modes = obj.modes.map((mode, index) => {
      const record = ensureRecord(mode, `modes[${index}]`);
      const modeChannels = Array.isArray(record.channels)
        ? record.channels.map((channel, channelIndex) => validateChannel(channel, channelIndex))
        : undefined;
      return {
        id: ensureString(record.id, `modes[${index}].id`),
        name: ensureString(record.name, `modes[${index}].name`),
        channelNames: Array.isArray(record.channelNames)
          ? record.channelNames.map((name, nameIndex) =>
              ensureString(name, `modes[${index}].channelNames[${nameIndex}]`)
            )
          : [],
        ...(modeChannels ? { channels: modeChannels } : {}),
      };
    });
  }

  let gdtfMeta;
  if (obj.gdtfMeta !== undefined) {
    const record = ensureRecord(obj.gdtfMeta, 'fixture.gdtfMeta');
    gdtfMeta = {
      fixtureTypeId: typeof record.fixtureTypeId === 'string' ? record.fixtureTypeId : undefined,
      manufacturer: typeof record.manufacturer === 'string' ? record.manufacturer : undefined,
      originalFileName: typeof record.originalFileName === 'string' ? record.originalFileName : undefined,
    };
  }

  const fixtureSource =
    obj.source === 'gdtf' || obj.source === 'yaml'
      ? obj.source
      : gdtfMeta
        ? 'gdtf'
        : 'yaml';

  return {
    id: ensureString(obj.id, 'fixture.id'),
    name: ensureString(obj.name, 'fixture.name'),
    channels,
    ...(widgets ? { widgets } : {}),
    ...(attributes ? { attributes } : {}),
    ...(modes ? { modes } : {}),
    ...(typeof obj.defaultModeId === 'string' ? { defaultModeId: obj.defaultModeId } : {}),
    source: fixtureSource,
    ...(gdtfMeta ? { gdtfMeta } : {}),
  };
}

export function parsePluginManifest(source: string): PluginManifest {
  const parsed = JSON.parse(source) as unknown;
  const obj = ensureRecord(parsed, 'plugin manifest');

  if (!Array.isArray(obj.fixtures)) {
    throw new Error('plugin manifest fixtures must be an array');
  }

  return {
    id: ensureString(obj.id, 'plugin manifest id'),
    version: ensureString(obj.version, 'plugin manifest version'),
    fixtures: obj.fixtures.map((fixture, index) =>
      ensureString(fixture, `plugin manifest fixtures[${index}]`)
    ),
  };
}
