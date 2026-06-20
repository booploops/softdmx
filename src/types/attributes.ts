/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export type AttributeFeature = 'dimmer' | 'position' | 'color' | 'beam' | 'control' | 'shutter' | 'generic';

export type AttributeMerge = 'htp' | 'ltp';

export type AttributeId = string;

export interface AttributeDefinition {
  id: AttributeId;
  feature: AttributeFeature;
  merge: AttributeMerge;
  channelName: string;
}

export interface FixtureModeDefinition {
  id: string;
  name: string;
  channelNames: string[];
  channels?: import('../types/index.ts').FixtureChannelDefinition[];
}

export interface FixtureGdtfMeta {
  fixtureTypeId?: string;
  manufacturer?: string;
  originalFileName?: string;
  descriptionXml?: string;
}
