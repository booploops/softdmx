/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import type { FixtureDefinition } from "src/types";

export const VRSL_Spotlight: FixtureDefinition = {
  id: "VRSL_Spotlight",
  name: "VRSL Spotlight",
  channels: [
    {
      name: "Pan",
      type: "position",
      minValue: 0,
      maxValue: 255,
      defaultValue: 127,
    },
    {
      name: "Pan fine",
      type: "position",
      minValue: 0,
      maxValue: 255,
      defaultValue: 128,
    },
    {
      name: "Tilt",
      type: "position",
      minValue: 0,
      maxValue: 255,
      defaultValue: 127,
    },
    {
      name: "Tilt fine",
      type: "position",
      minValue: 0,
      maxValue: 255,
      defaultValue: 128,
    },
    {
      name: "Zoom",
      type: "effect",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
    {
      name: "Dimmer",
      type: "intensity",
      minValue: 0,
      maxValue: 255,
      defaultValue: 255,
    },
    {
      name: "Strobe",
      type: "effect",
      minValue: 0,
      maxValue: 255,
      defaultValue: 0,
    },
    {
      name: "Red",
      type: "color",
      minValue: 0,
      maxValue: 255,
      defaultValue: 255,
    },
    {
      name: "Green",
      type: "color",
      minValue: 0,
      maxValue: 255,
      defaultValue: 255,
    },
    {
      name: "Blue",
      type: "color",
      minValue: 0,
      maxValue: 255,
      defaultValue: 255,
    },
    {
      name: "Gobo Spin Speed",
      type: "effect",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
    {
      name: "Gobo Index",
      type: "effect",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
    {
      name: "Mover Speed",
      type: "effect",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
  ],
  widgets: [
    {
      type: "lightMover",
      name: "Pan/Tilt Control",
      channels: {
        panChannel: "Pan",
        panFineChannel: "Pan fine",
        tiltChannel: "Tilt",
        tiltFineChannel: "Tilt fine"
      }
    },
    {
      type: "colorPicker",
      name: "RGB Color",
      channels: {
        redChannel: "Red",
        greenChannel: "Green",
        blueChannel: "Blue"
      }
    },
    {
      type: "dimmerSlider",
      name: "Intensity",
      channels: {
        dimmerChannel: "Dimmer"
      }
    }
  ]
};
