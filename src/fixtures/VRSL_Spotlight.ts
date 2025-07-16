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
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
    {
      name: "Pan fine",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
    {
      name: "Tilt",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
    {
      name: "Tilt fine",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
    {
      name: "Zoom",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
    {
      name: "Dimmer",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 255,
    },
    {
      name: "Strobe",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 0,
    },
    {
      name: "Red",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
    {
      name: "Green",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
    {
      name: "Blue",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
    {
      name: "Gobo Spin Speed",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
    {
      name: "Gobo Index",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
    {
      name: "Mover Speed",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
  ],
};
