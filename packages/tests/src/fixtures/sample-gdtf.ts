/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * Test helper: minimal GDTF wash fixture as zip bytes.
 */

import { strToU8, zipSync } from 'fflate';

export const SAMPLE_GDTF_DESCRIPTION = `<?xml version="1.0" encoding="UTF-8"?>
<GDTF DataVersion="1.2">
  <FixtureType Name="Sample Wash" FixtureTypeID="Sample_Wash" ShortName="SampleWash">
    <AttributeDefinitions>
      <Attributes>
        <Attribute Name="Dimmer" Feature="Dimmer.Dimmer" />
        <Attribute Name="ColorAdd_R" Feature="Color.RGB.Red" />
        <Attribute Name="ColorAdd_G" Feature="Color.RGB.Green" />
        <Attribute Name="ColorAdd_B" Feature="Color.RGB.Blue" />
        <Attribute Name="Pan" Feature="Position.PanTilt.Pan" />
        <Attribute Name="Tilt" Feature="Position.PanTilt.Tilt" />
      </Attributes>
    </AttributeDefinitions>
    <Wheels />
    <DMXModes>
      <DMXMode Name="6 Channel">
        <DMXChannels>
          <DMXChannel Offset="1">
            <LogicalChannel Attribute="Dimmer">
              <ChannelFunction Attribute="Dimmer" DMXChange="None">
                <ChannelSet Name="Closed" DMXFrom="0/1" />
                <ChannelSet Name="Open" DMXFrom="255/1" />
              </ChannelFunction>
            </LogicalChannel>
          </DMXChannel>
          <DMXChannel Offset="2"><LogicalChannel Attribute="ColorAdd_R"><ChannelFunction Attribute="ColorAdd_R" /></LogicalChannel></DMXChannel>
          <DMXChannel Offset="3"><LogicalChannel Attribute="ColorAdd_G"><ChannelFunction Attribute="ColorAdd_G" /></LogicalChannel></DMXChannel>
          <DMXChannel Offset="4"><LogicalChannel Attribute="ColorAdd_B"><ChannelFunction Attribute="ColorAdd_B" /></LogicalChannel></DMXChannel>
          <DMXChannel Offset="5"><LogicalChannel Attribute="Pan"><ChannelFunction Attribute="Pan" /></LogicalChannel></DMXChannel>
          <DMXChannel Offset="6"><LogicalChannel Attribute="Tilt"><ChannelFunction Attribute="Tilt" /></LogicalChannel></DMXChannel>
        </DMXChannels>
      </DMXMode>
      <DMXMode Name="3 Channel">
        <DMXChannels>
          <DMXChannel Offset="1"><LogicalChannel Attribute="Dimmer"><ChannelFunction Attribute="Dimmer" /></LogicalChannel></DMXChannel>
          <DMXChannel Offset="2"><LogicalChannel Attribute="ColorAdd_R"><ChannelFunction Attribute="ColorAdd_R" /></LogicalChannel></DMXChannel>
          <DMXChannel Offset="3"><LogicalChannel Attribute="ColorAdd_G"><ChannelFunction Attribute="ColorAdd_G" /></LogicalChannel></DMXChannel>
        </DMXChannels>
      </DMXMode>
    </DMXModes>
  </FixtureType>
</GDTF>`;

export function createSampleGdtfBytes(): Uint8Array {
  return zipSync({
    'description.xml': strToU8(SAMPLE_GDTF_DESCRIPTION),
  });
}
