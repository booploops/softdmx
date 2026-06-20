/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ShowDocumentV1 } from 'src/types/show-document';

const fixtureNames = {
  stageSideLeft: ['Stage Side Left 1', 'Stage Side Left 2', 'Stage Side Left 3', 'Stage Side Left 4'],
  stageSideRight: ['Stage Side Right 1', 'Stage Side Right 2', 'Stage Side Right 3', 'Stage Side Right 4'],
  stageFront: ['Stage Front 1', 'Stage Front 2', 'Stage Front 3', 'Stage Front 4', 'Stage Front 5', 'Stage Front 6', 'Stage Front 7', 'Stage Front 8', 'Stage Front 9'],
  stageCenter: ['Stage Center 1', 'Stage Center 2', 'Stage Center 3', 'Stage Center 4', 'Stage Center 5', 'Stage Center 6'],
  stageBack: ['Stage Back 1', 'Stage Back 2', 'Stage Back 3'],
};

const allFixtures = Object.values(fixtureNames).flat();

export const exampleVrClubShow: ShowDocumentV1 = {
  version: '1.0',
  meta: {
    name: 'Example VR Club',
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
  fixtures: allFixtures.map((name) => ({
    name,
    fixtureId: 'VRSL_Spotlight',
  })),
  groups: [
    { name: 'Stage Side Left', fixtures: fixtureNames.stageSideLeft, color: '#e53935' },
    { name: 'Stage Side Right', fixtures: fixtureNames.stageSideRight, color: '#1e88e5' },
    { name: 'Stage Front', fixtures: fixtureNames.stageFront, color: '#43a047' },
    { name: 'Stage Center', fixtures: fixtureNames.stageCenter, color: '#fb8c00' },
    { name: 'Stage Back', fixtures: fixtureNames.stageBack, color: '#8e24aa' },
  ],
  presets: [
    {
      id: 'red_wash',
      name: 'Red Wash',
      color: '#ff0000',
      targets: [
        {
          group: 'Stage Front',
          attrs: { Red: 255, Green: 0, Blue: 0, Dimmer: 255 },
        },
      ],
    },
    {
      id: 'blue_wash',
      name: 'Blue Wash',
      color: '#0066ff',
      targets: [
        {
          group: 'Stage Front',
          attrs: { Red: 0, Green: 64, Blue: 255, Dimmer: 255 },
        },
      ],
    },
    {
      id: 'center_spot',
      name: 'Center Spotlight',
      color: '#ffffff',
      targets: [
        {
          group: 'Stage Center',
          attrs: { Red: 255, Green: 255, Blue: 255, Dimmer: 255 },
        },
      ],
    },
    {
      id: 'blackout',
      name: 'Blackout',
      targets: [
        {
          group: 'Stage Front',
          attrs: { Dimmer: 0 },
        },
        {
          group: 'Stage Center',
          attrs: { Dimmer: 0 },
        },
      ],
    },
  ],
  effects: [
    {
      id: 'front_pulse',
      name: 'Front Pulse',
      type: 'sine',
      enabled: false,
      target: { group: 'Stage Front', attr: 'Dimmer' },
      rate: 0.5,
      depth: 0.8,
      offset: 128,
      sync: 'link',
    },
    {
      id: 'side_chase',
      name: 'Side Chase',
      type: 'chase',
      enabled: false,
      target: { group: 'Stage Side Left', attr: 'Dimmer' },
      rate: 1,
      width: 1,
      direction: 'forward',
    },
  ],
  cues: [
    {
      id: 'intro-stack',
      name: 'Intro',
      description: 'Stack cue: red wash then blue wash',
      view: 'stack',
      stack: [
        { id: 'step-1', presetId: 'red_wash', fadeIn: 2000, follow: 'auto' },
        { id: 'step-2', presetId: 'blue_wash', fadeIn: 2000, follow: 'manual' },
      ],
      totalDuration: 4000,
      isLooping: false,
      fadeInDuration: 0,
      fadeOutDuration: 0,
      priority: 2,
      tags: ['stack'],
      created: '2026-01-01T00:00:00.000Z',
      modified: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'red-wash-timeline',
      name: 'Red Wash',
      description: 'Timeline cue with preset reference',
      view: 'timeline',
      layers: [
        {
          id: 'layer-main',
          name: 'Main',
          frames: [
            {
              name: 'Red',
              type: 'preset',
              presetId: 'red_wash',
              duration: 3000,
              easing: 'linear',
            },
          ],
          enabled: true,
          opacity: 1,
          blendMode: 'replace',
          solo: false,
        },
      ],
      totalDuration: 3000,
      isLooping: false,
      fadeInDuration: 0,
      fadeOutDuration: 0,
      priority: 2,
      tags: [],
      created: '2026-01-01T00:00:00.000Z',
      modified: '2026-01-01T00:00:00.000Z',
    },
  ],
  bindings: {
    midi: [],
    osc: [],
  },
};
