/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Example showfile demonstrating explicit starting channel assignments
 */
import type { Showfile } from "src/types";

export const StartingChannelExampleShowfile: Showfile = {
  name: "Starting Channel Example",
  fixtures: [
    {
      name: "Light 1",
      fixtureId: "VRSL_Spotlight",
      // No starting channel - will use default (channel 1)
    },
    {
      name: "Light 2",
      fixtureId: "VRSL_Spotlight",
      // No starting channel - will continue after Light 1 (channel 26)
    },
    {
      name: "Emergency Light",
      fixtureId: "VRSL_Light5CH",
      startingChannel: 100  // Explicitly start at channel 100
    },
    {
      name: "Light 3",
      fixtureId: "VRSL_Spotlight",
      // No starting channel - will continue after Emergency Light (channel 105)
    },
    {
      name: "Master Control",
      fixtureId: "VRSL_Light5CH",
      startingChannel: 200  // Explicitly start at channel 200
    },
    {
      name: "Light 4",
      fixtureId: "VRSL_Spotlight",
      // No starting channel - will continue after Master Control (channel 205)
    }
  ],
  linkedGroups: [
    {
      name: "Main Lights",
      names: ["Light 1", "Light 2", "Light 3", "Light 4"]
    },
    {
      name: "Special Controls",
      names: ["Emergency Light", "Master Control"]
    }
  ]
};
