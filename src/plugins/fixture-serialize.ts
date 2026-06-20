/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as YAML from 'yaml';
import type { FixtureDefinition } from 'src/types';

export function serializeFixtureYaml(fixture: FixtureDefinition): string {
  const exportDoc = {
    id: fixture.id,
    name: fixture.name,
    ...(fixture.source ? { source: fixture.source } : {}),
    ...(fixture.defaultModeId ? { defaultModeId: fixture.defaultModeId } : {}),
    ...(fixture.attributes?.length
      ? {
          attributes: fixture.attributes.map((attribute) => ({
            id: attribute.id,
            feature: attribute.feature,
            merge: attribute.merge,
            channelName: attribute.channelName,
          })),
        }
      : {}),
    ...(fixture.modes?.length
      ? {
          modes: fixture.modes.map((mode) => ({
            id: mode.id,
            name: mode.name,
            channelNames: mode.channelNames,
            ...(mode.channels?.length
              ? {
                  channels: mode.channels.map((channel) => serializeChannel(channel)),
                }
              : {}),
          })),
        }
      : {}),
    channels: fixture.channels.map((channel) => serializeChannel(channel)),
    ...(fixture.widgets?.length ? { widgets: fixture.widgets } : {}),
    ...(fixture.gdtfMeta
      ? {
          gdtfMeta: {
            fixtureTypeId: fixture.gdtfMeta.fixtureTypeId,
            manufacturer: fixture.gdtfMeta.manufacturer,
            originalFileName: fixture.gdtfMeta.originalFileName,
          },
        }
      : {}),
  };

  return YAML.stringify(exportDoc);
}

function serializeChannel(channel: FixtureDefinition['channels'][number]) {
  return {
    name: channel.name,
    type: channel.type,
    minValue: channel.minValue,
    maxValue: channel.maxValue,
    defaultValue: channel.defaultValue,
    ...(channel.attributeId ? { attributeId: channel.attributeId } : {}),
    ...(channel.dmxOffset !== undefined ? { dmxOffset: channel.dmxOffset } : {}),
    ...(channel.controlMode ? { controlMode: channel.controlMode } : {}),
    ...(channel.indexedSlots !== undefined ? { indexedSlots: channel.indexedSlots } : {}),
    ...(channel.indexedLabels?.length ? { indexedLabels: channel.indexedLabels } : {}),
  };
}

export function downloadFixtureYaml(fixture: FixtureDefinition, filename?: string): boolean {
  try {
    const yamlContent = serializeFixtureYaml(fixture);
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename ?? `${fixture.id.replace(/\s+/g, '_')}.yaml`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Failed to export fixture YAML:', error);
    return false;
  }
}
