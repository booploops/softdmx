/*
 * Copyright (C) 2025-Present booploops and contributors
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export type ActiveChannel = {
  id: number;
  path: string;
  value: number;
};

export type Showfile = {
  name: string;
  fixtures: ShowfileFixture[];
  linkedGroups?: ShowfileLinkedGroup[];
};

export type ShowfileLinkedGroup = {
  name: string;
  names: string[];
}

export type ShowfileFixture = {
  name: string;
  fixtureId: string;
};

export type FixtureChannelDefinition = {
  name: string;
  type: "intensity" | "color" | "effect" | "position" | (string & {});
  minValue: number;
  maxValue: number;
  defaultValue: number;
  reference?: ActiveChannel; // Optional reference to an active channel
};

export type FixtureDefinition = {
  id: string;
  name: string;
  channels: FixtureChannelDefinition[];
};

export type FixtureChannelWithReference = FixtureChannelDefinition & {
  reference: ActiveChannel;
};

export type ShowfileFixtureMapped = {
  fixtureName: string;
  def: FixtureDefinition & {
    channels: FixtureChannelWithReference[];
  };
};

export type RecordedFrame = {
  name: string;
  type: 'channels' | 'delay';
  channels: ActiveChannel[];
  delayDuration?: number; // Optional delay duration in milliseconds
}
