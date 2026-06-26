/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export type ActiveChannel = {
  id: number;
  universe?: string;
  path: string;
  value: number;
  attributeType?: string;
};

export type FixtureChannelDefinition = {
  name: string;
  type: "intensity" | "color" | "effect" | "position" | (string & {});
  minValue: number;
  maxValue: number;
  defaultValue: number;
  attributeId?: string;
  dmxOffset?: number;
  /** Continuous DMX slider (default) or discrete indexed slots (gobo, color wheel, etc.). */
  controlMode?: "dmx" | "indexed";
  /** Number of discrete slots when controlMode is indexed. */
  indexedSlots?: number;
  /** Optional labels for each slot (length must match indexedSlots). */
  indexedLabels?: string[];
  reference?: ActiveChannel;
};

export type FixtureSource = "yaml" | "gdtf";

export type WidgetConfiguration = {
  type: "lightMover" | "colorPicker" | "dimmerSlider" | "strobe" | "indexedSelect" | (string & {});
  name: string;
  channels: {
    [key: string]: string;
  };
};

export type FixtureDefinition = {
  id: string;
  name: string;
  channels: FixtureChannelDefinition[];
  widgets?: WidgetConfiguration[];
  attributes?: import("./attributes.ts").AttributeDefinition[];
  modes?: import("./attributes.ts").FixtureModeDefinition[];
  defaultModeId?: string;
  source?: FixtureSource;
  gdtfMeta?: import("./attributes.ts").FixtureGdtfMeta;
};

export type FixtureChannelWithReference = FixtureChannelDefinition & {
  reference: ActiveChannel;
};

export type MappedShowFixture = {
  fixtureName: string;
  def: FixtureDefinition & {
    channels: FixtureChannelWithReference[];
  };
};
