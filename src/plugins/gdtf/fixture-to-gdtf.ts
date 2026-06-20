/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { strToU8, zipSync } from 'fflate';
import type { FixtureDefinition } from 'src/types';
import { inferMergeForFeature, mapGdtfFeatureToAttributeFeature } from './feature-map.ts';
import { resolveFixtureChannelsForMode } from './gdtf-to-fixture.ts';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function featureForAttribute(name: string, feature?: string): string {
  const mapped = feature ?? mapGdtfFeatureToAttributeFeature(undefined, name);
  switch (mapped) {
    case 'dimmer':
      return 'Dimmer.Dimmer';
    case 'color':
      return 'Color.RGB.Red';
    case 'position':
      return name.toLowerCase().includes('tilt') ? 'Position.PanTilt.Tilt' : 'Position.PanTilt.Pan';
    case 'beam':
      return 'Beam.Beam';
    case 'shutter':
      return 'Shutter.Strobe';
    default:
      return 'Control.Control';
  }
}

export function fixtureToGdtfDescriptionXml(fixture: FixtureDefinition): string {
  const attributes = fixture.attributes?.length
    ? fixture.attributes
    : fixture.channels.map((channel) => ({
        id: channel.attributeId ?? channel.name,
        feature: mapGdtfFeatureToAttributeFeature(undefined, channel.name),
        merge: inferMergeForFeature(mapGdtfFeatureToAttributeFeature(undefined, channel.name)),
        channelName: channel.name,
      }));

  const attributeXml = attributes
    .map(
      (attribute) =>
        `<Attribute Name="${escapeXml(attribute.id)}" Feature="${escapeXml(featureForAttribute(attribute.id, attribute.feature))}" />`
    )
    .join('\n        ');

  const modes = fixture.modes?.length
    ? fixture.modes
    : [
        {
          id: 'mode-1',
          name: 'Default',
          channelNames: fixture.channels.map((channel) => channel.name),
          channels: fixture.channels,
        },
      ];

  const modeXml = modes
    .map((mode) => {
      const modeChannels = mode.channels?.length
        ? mode.channels
        : resolveFixtureChannelsForMode(fixture, mode.id);
      const channelXml = modeChannels
        .map((channel, index) => {
          const offset = channel.dmxOffset ?? index + 1;
          const sets =
            channel.controlMode === 'indexed' && channel.indexedLabels?.length
              ? channel.indexedLabels
                  .map(
                    (label, slotIndex) =>
                      `<ChannelSet Name="${escapeXml(label)}" DMXFrom="${slotIndex}/${
                        channel.indexedLabels!.length
                      }" />`
                  )
                  .join('\n                ')
              : '<ChannelSet Name="Min" DMXFrom="0/1" />';
          return `<DMXChannel Offset="${offset}">
            <LogicalChannel Attribute="${escapeXml(channel.attributeId ?? channel.name)}">
              <ChannelFunction Attribute="${escapeXml(channel.attributeId ?? channel.name)}" DMXChange="None">
                ${sets}
              </ChannelFunction>
            </LogicalChannel>
          </DMXChannel>`;
        })
        .join('\n          ');
      return `<DMXMode Name="${escapeXml(mode.name)}">
        <DMXChannels>
          ${channelXml}
        </DMXChannels>
      </DMXMode>`;
    })
    .join('\n      ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<GDTF DataVersion="1.2">
  <FixtureType Name="${escapeXml(fixture.name)}" FixtureTypeID="${escapeXml(fixture.gdtfMeta?.fixtureTypeId ?? fixture.id)}" ShortName="${escapeXml(fixture.id)}">
    <AttributeDefinitions>
      <Attributes>
        ${attributeXml}
      </Attributes>
    </AttributeDefinitions>
    <DMXModes>
      ${modeXml}
    </DMXModes>
  </FixtureType>
</GDTF>`;
}

export function exportFixtureGdtfBytes(fixture: FixtureDefinition): Uint8Array {
  const descriptionXml =
    fixture.gdtfMeta?.descriptionXml && fixture.source === 'gdtf'
      ? fixture.gdtfMeta.descriptionXml
      : fixtureToGdtfDescriptionXml(fixture);
  const zipEntries: Record<string, Uint8Array> = {
    'description.xml': strToU8(descriptionXml),
  };
  return zipSync(zipEntries);
}

export function downloadFixtureGdtf(fixture: FixtureDefinition, filename?: string): boolean {
  try {
    const bytes = exportFixtureGdtfBytes(fixture);
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename ?? `${fixture.id.replace(/\s+/g, '_')}.gdtf`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Failed to export fixture GDTF:', error);
    return false;
  }
}
