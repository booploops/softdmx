/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ShowDocument } from '@softdmx/engine';

export const laserDemoShow: ShowDocument = {
  version: '1.1',
  meta: {
    name: 'Laser Demo',
    created: '2026-01-01T00:00:00.000Z',
    modified: '2026-01-01T00:00:00.000Z',
  },
  plugins: ['builtin'],
  destinations: [
    {
      id: 'default-gridnode',
      name: 'Default GridNode Overlay',
      type: 'gridnode',
      settings: {},
    },
  ],
  fixtures: [
    { name: 'Laser Left', fixtureId: 'LC_LatrixLasers' },
    { name: 'Laser Right', fixtureId: 'LC_LatrixLasers' },
    { name: 'Center Spot', fixtureId: 'VRSL_Spotlight' },
  ],
  groups: [
    { name: 'Lasers', fixtures: ['Laser Left', 'Laser Right'] },
    { name: 'Front Spot', fixtures: ['Center Spot'] },
  ],
  presets: [
    {
      id: 'laser-full',
      name: 'Laser Full',
      color: '#7b61ff',
      targets: [{ group: 'Lasers', attrs: { Brightness: 255, Falloff: 255 } }],
    },
    {
      id: 'laser-thin',
      name: 'Laser Thin',
      color: '#54d0ff',
      targets: [{ group: 'Lasers', attrs: { Brightness: 220, Falloff: 35 } }],
    },
    {
      id: 'spot-white',
      name: 'Spot White',
      targets: [{ group: 'Front Spot', attrs: { Dimmer: 255, Red: 255, Green: 255, Blue: 255 } }],
    },
  ],
  effects: [],
  cues: [],
  bindings: {
    midi: [],
    osc: [],
  },
  audioMappings: [],
  executors: [],
  submasters: [],
};
