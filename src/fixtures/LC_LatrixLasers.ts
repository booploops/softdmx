import type { FixtureDefinition } from "src/types";

export const LC_LatrixLasers: FixtureDefinition = {
  id: "LC_LatrixLasers",
  name: "LC Latrix Lasers",
  channels: [
    {
      name: "Falloff",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 255,
    },
    {
      name: "Brightness",
      type: "generic",
      minValue: 0,
      maxValue: 255,
      defaultValue: 255,
    },
  ],
};
