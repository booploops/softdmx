/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fc from 'fast-check';
import {
  mergeLayers,
  scalesWithIntensityMaster,
  type LayerContribution,
} from '../../../frontend/src/engine/types.ts';
import type { ActiveChannel } from '../../../frontend/src/types/index.ts';

const attributeTypeArb = fc.constantFrom('intensity', 'color', 'position', 'generic', 'effect');
const dmxValueArb = fc.integer({ min: -64, max: 320 });
const grandMasterArb = fc.double({ min: -0.5, max: 1.5, noNaN: true });
const priorityArb = fc.integer({ min: 0, max: 200 });
const layerSourceArb = fc.constantFrom('scratch', 'cue', 'effect', 'audio', 'video', 'base') as fc.Arbitrary<
  LayerContribution['source']
>;

const inRangeBaseChannelArb: fc.Arbitrary<ActiveChannel> = fc.record({
  id: fc.integer({ min: 1, max: 10_000 }),
  path: fc.string({ minLength: 3, maxLength: 40 }).map((path) => `show://${path.replace(/[^\w/-]/g, 'x')}`),
  value: fc.integer({ min: 0, max: 255 }),
  attributeType: attributeTypeArb,
});

const layerOverrideArb = fc.record({
  baseIndex: fc.nat(),
  value: dmxValueArb,
  attributeType: attributeTypeArb,
});

const layerDefArb = fc.record({
  source: layerSourceArb,
  priority: priorityArb,
  overrides: fc.array(layerOverrideArb, { maxLength: 6 }),
});

type LayerDef = fc.Arbitrary<typeof layerDefArb> extends fc.Arbitrary<infer T> ? T : never;

function buildLayers(baseChannels: ActiveChannel[], layerDefs: LayerDef[]): LayerContribution[] {
  return layerDefs.map((def) => ({
    source: def.source,
    priority: def.priority,
    channels: new Map(
      def.overrides.map((override) => {
        const base = baseChannels[override.baseIndex % baseChannels.length]!;
        return [
          base.path,
          {
            path: base.path,
            value: override.value,
            attributeType: override.attributeType ?? base.attributeType ?? 'generic',
            priority: def.priority,
            source: 'cue' as const,
          },
        ];
      }),
    ),
  }));
}

test('mergeLayers output values are always clamped to 0-255', () => {
  fc.assert(
    fc.property(
      fc.array(inRangeBaseChannelArb, { minLength: 1, maxLength: 10 }),
      fc.array(layerDefArb, { maxLength: 4 }),
      grandMasterArb,
      fc.boolean(),
      (baseChannels, layerDefs, grandMaster, blackout) => {
        const layers = buildLayers(baseChannels, layerDefs);
        const merged = mergeLayers(baseChannels, layers, { grandMaster, blackout });
        for (const channel of merged) {
          assert.ok(channel.value >= 0 && channel.value <= 255, `value out of range: ${channel.value}`);
          assert.equal(channel.value, Math.round(channel.value));
        }
      },
    ),
    { numRuns: 100 },
  );
});

test('mergeLayers blackout zeros intensity channels', () => {
  fc.assert(
    fc.property(fc.array(inRangeBaseChannelArb, { minLength: 1, maxLength: 12 }), fc.array(layerDefArb, { maxLength: 3 }), (baseChannels, layerDefs) => {
      const layers = buildLayers(baseChannels, layerDefs);
      const merged = mergeLayers(baseChannels, layers, { grandMaster: 1, blackout: true });
      for (const channel of merged) {
        if ((channel.attributeType ?? 'generic') === 'intensity') {
          assert.equal(channel.value, 0);
        }
      }
    }),
    { numRuns: 75 },
  );
});

test('mergeLayers grandMaster scales intensity and color channels', () => {
  fc.assert(
    fc.property(
      fc.array(inRangeBaseChannelArb, { minLength: 1, maxLength: 8 }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      (baseChannels, grandMaster) => {
        const withoutMaster = mergeLayers(baseChannels, [], { grandMaster: 1, blackout: false });
        const withMaster = mergeLayers(baseChannels, [], { grandMaster, blackout: false });

        for (const channel of withMaster) {
          const attributeType = channel.attributeType ?? 'generic';
          const baseline = withoutMaster.find((entry) => entry.path === channel.path);
          assert.ok(baseline);

          if (scalesWithIntensityMaster(attributeType)) {
            const expected = Math.max(0, Math.min(255, Math.round(baseline.value * grandMaster)));
            assert.equal(channel.value, expected);
          } else {
            assert.equal(channel.value, baseline.value);
          }
        }
      },
    ),
    { numRuns: 75 },
  );
});
