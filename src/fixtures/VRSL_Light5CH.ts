/*
 * Copyright (C) 2025-Present booploops and contributors
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import type { FixtureDefinition } from "src/types";

export const VRSL_Light5CH: FixtureDefinition = {
  id: "VRSL_Light5CH",
  name: "VRSL Light 5CH",
  channels: [
    {
      name: "Dimmer",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
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
      name: "Strobe",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 100,
    },
  ],
};
