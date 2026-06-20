/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ShowDocumentV1 } from 'src/types/show-document';

export const simpleWashShow: ShowDocumentV1 = {
  version: '1.1',
  meta: {
    name: 'Simple Wash',
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
    { name: 'Wash Left', fixtureId: 'VRSL_Light5CH' },
    { name: 'Wash Center', fixtureId: 'VRSL_Light5CH' },
    { name: 'Wash Right', fixtureId: 'VRSL_Light5CH' },
  ],
  groups: [{ name: 'Wash', fixtures: ['Wash Left', 'Wash Center', 'Wash Right'] }],
  presets: [
    {
      id: 'warm-amber',
      name: 'Warm Amber',
      color: '#ffad33',
      targets: [{ group: 'Wash', attrs: { Dimmer: 255, Red: 255, Green: 170, Blue: 60 } }],
    },
    {
      id: 'cool-blue',
      name: 'Cool Blue',
      color: '#2e8bff',
      targets: [{ group: 'Wash', attrs: { Dimmer: 255, Red: 40, Green: 140, Blue: 255 } }],
    },
    {
      id: 'blackout',
      name: 'Blackout',
      targets: [{ group: 'Wash', attrs: { Dimmer: 0 } }],
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
