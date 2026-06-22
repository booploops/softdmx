/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { SoftDMXPlugin } from '../types';
import type { FixtureDefinition } from 'src/types/fixture';

export const VRSL_Spotlight: FixtureDefinition = {
  id: 'VRSL_Spotlight',
  name: 'VRSL Spotlight',
  channels: [
    { name: 'Pan', type: 'position', minValue: 0, maxValue: 255, defaultValue: 127 },
    { name: 'Pan fine', type: 'position', minValue: 0, maxValue: 255, defaultValue: 128 },
    { name: 'Tilt', type: 'position', minValue: 0, maxValue: 255, defaultValue: 127 },
    { name: 'Tilt fine', type: 'position', minValue: 0, maxValue: 255, defaultValue: 128 },
    { name: 'Zoom', type: 'effect', minValue: 0, maxValue: 255, defaultValue: 100 },
    { name: 'Dimmer', type: 'intensity', minValue: 0, maxValue: 255, defaultValue: 255 },
    { name: 'Strobe', type: 'effect', minValue: 0, maxValue: 255, defaultValue: 0 },
    { name: 'Red', type: 'color', minValue: 0, maxValue: 255, defaultValue: 255 },
    { name: 'Green', type: 'color', minValue: 0, maxValue: 255, defaultValue: 255 },
    { name: 'Blue', type: 'color', minValue: 0, maxValue: 255, defaultValue: 255 },
    { name: 'Gobo Spin Speed', type: 'effect', minValue: 0, maxValue: 255, defaultValue: 100 },
    {
      name: 'Gobo Index',
      type: 'effect',
      minValue: 0,
      maxValue: 255,
      defaultValue: 8,
      controlMode: 'indexed',
      indexedSlots: 16,
      indexedLabels: [
        'Open',
        'Gobo 2',
        'Gobo 3',
        'Gobo 4',
        'Gobo 5',
        'Gobo 6',
        'Gobo 7',
        'Gobo 8',
        'Gobo 9',
        'Gobo 10',
        'Gobo 11',
        'Gobo 12',
        'Gobo 13',
        'Gobo 14',
        'Gobo 15',
        'Gobo 16',
      ],
    },
    { name: 'Mover Speed', type: 'effect', minValue: 0, maxValue: 255, defaultValue: 100 },
  ],
  widgets: [
    {
      type: 'lightMover',
      name: 'Pan/Tilt Control',
      channels: {
        panChannel: 'Pan',
        panFineChannel: 'Pan fine',
        tiltChannel: 'Tilt',
        tiltFineChannel: 'Tilt fine',
      },
    },
    {
      type: 'colorPicker',
      name: 'RGB Color',
      channels: { redChannel: 'Red', greenChannel: 'Green', blueChannel: 'Blue' },
    },
    {
      type: 'dimmerSlider',
      name: 'Intensity',
      channels: { dimmerChannel: 'Dimmer' },
    },
    {
      type: 'strobe',
      name: 'Strobe Effect',
      channels: { strobeChannel: 'Strobe' },
    },
    {
      type: 'indexedSelect',
      name: 'Gobo',
      channels: { channel: 'Gobo Index' },
    },
  ],
};

export const VRSL_Light5CH: FixtureDefinition = {
  id: 'VRSL_Light5CH',
  name: 'VRSL Light 5CH',
  channels: [
    { name: 'Dimmer', type: 'intensity', minValue: 0, maxValue: 255, defaultValue: 100 },
    { name: 'Red', type: 'color', minValue: 0, maxValue: 255, defaultValue: 100 },
    { name: 'Green', type: 'color', minValue: 0, maxValue: 255, defaultValue: 100 },
    { name: 'Blue', type: 'color', minValue: 0, maxValue: 255, defaultValue: 100 },
    { name: 'Strobe', type: 'effect', minValue: 0, maxValue: 255, defaultValue: 0 },
  ],
  widgets: [
    {
      type: 'colorPicker',
      name: 'RGB Color',
      channels: { redChannel: 'Red', greenChannel: 'Green', blueChannel: 'Blue' },
    },
    {
      type: 'dimmerSlider',
      name: 'Intensity',
      channels: { dimmerChannel: 'Dimmer' },
    },
    {
      type: 'strobe',
      name: 'Strobe Effect',
      channels: { strobeChannel: 'Strobe' },
    },
  ],
};

export const LC_LatrixLasers: FixtureDefinition = {
  id: 'LC_LatrixLasers',
  name: 'LC Latrix Lasers',
  channels: [
    { name: 'Falloff', type: 'effect', minValue: 0, maxValue: 255, defaultValue: 255 },
    { name: 'Brightness', type: 'intensity', minValue: 0, maxValue: 255, defaultValue: 255 },
  ],
  widgets: [
    {
      type: 'dimmerSlider',
      name: 'Brightness',
      channels: { dimmerChannel: 'Brightness' },
    },
  ],
};

export const builtinPlugin: SoftDMXPlugin = {
  id: 'builtin',
  version: '1.0.0',
  fixtures: [VRSL_Spotlight, VRSL_Light5CH, LC_LatrixLasers],
};
