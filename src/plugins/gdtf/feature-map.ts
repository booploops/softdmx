/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { AttributeFeature } from 'src/types/attributes';

const FEATURE_PREFIXES: Array<[RegExp, AttributeFeature]> = [
  [/^Dimmer/i, 'dimmer'],
  [/Dimmer/i, 'dimmer'],
  [/Color/i, 'color'],
  [/PanTilt|Position/i, 'position'],
  [/Gobo|Beam|Focus|Zoom|Iris|Prism/i, 'beam'],
  [/Shutter|Strobe/i, 'shutter'],
  [/Control|Effect|Speed|Macro/i, 'control'],
];

export function mapGdtfFeatureToAttributeFeature(feature: string | undefined, name: string): AttributeFeature {
  const haystack = `${feature ?? ''} ${name}`;
  for (const [pattern, mapped] of FEATURE_PREFIXES) {
    if (pattern.test(haystack)) return mapped;
  }
  return 'generic';
}

export function inferMergeForFeature(feature: AttributeFeature): 'htp' | 'ltp' {
  return feature === 'dimmer' || feature === 'color' ? 'htp' : 'ltp';
}

export function sanitizeFixtureId(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'Fixture';
}

export function sanitizeModeId(name: string, index: number): string {
  const base = sanitizeFixtureId(name).toLowerCase();
  return `${base || 'mode'}-${index + 1}`;
}
