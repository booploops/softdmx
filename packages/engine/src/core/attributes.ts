/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { FixtureDefinition } from '../types';
import type { AttributeDefinition, AttributeFeature, AttributeMerge } from '../types/attributes';

const FEATURE_BY_TYPE: Record<string, AttributeFeature> = {
  intensity: 'dimmer',
  dimmer: 'dimmer',
  color: 'color',
  pan: 'position',
  tilt: 'position',
  position: 'position',
  gobo: 'beam',
  shutter: 'shutter',
  strobe: 'shutter',
  effect: 'control',
  generic: 'generic',
};

export function inferAttributeFeature(channelType: string, channelName: string): AttributeFeature {
  const normalizedType = channelType.toLowerCase();
  if (FEATURE_BY_TYPE[normalizedType]) return FEATURE_BY_TYPE[normalizedType]!;

  const name = channelName.toLowerCase();
  if (name.includes('dim')) return 'dimmer';
  if (name.includes('pan') || name.includes('tilt')) return 'position';
  if (name.includes('red') || name.includes('green') || name.includes('blue') || name.includes('color')) {
    return 'color';
  }
  if (name.includes('gobo') || name.includes('zoom') || name.includes('focus')) return 'beam';
  if (name.includes('shutter') || name.includes('strobe')) return 'shutter';
  return 'generic';
}

export function inferAttributeMerge(feature: AttributeFeature): AttributeMerge {
  return feature === 'dimmer' || feature === 'color' ? 'htp' : 'ltp';
}

export function buildAttributeDefinitions(def: FixtureDefinition): AttributeDefinition[] {
  return def.channels.map((channel) => {
    const feature = inferAttributeFeature(channel.type, channel.name);
    return {
      id: channel.name,
      feature,
      merge: inferAttributeMerge(feature),
      channelName: channel.name,
    };
  });
}

export function attributeMatchesFilter(
  attribute: AttributeDefinition,
  filter?: AttributeFeature[]
): boolean {
  if (!filter || filter.length === 0) return true;
  return filter.includes(attribute.feature);
}

export function resolveChannelAttribute(
  def: FixtureDefinition,
  channelName: string
): AttributeDefinition | undefined {
  return buildAttributeDefinitions(def).find((attr) => attr.channelName === channelName);
}
