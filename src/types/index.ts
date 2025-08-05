/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export type ActiveChannel = {
  id: number;
  path: string;
  value: number;
};

export type Showfile = {
  name: string;
  fixtures: ShowfileFixture[];
  linkedGroups?: ShowfileLinkedGroup[];
};

export type ShowfileLinkedGroup = {
  name: string;
  names: string[];
}

export type ShowfileFixture = {
  name: string;
  fixtureId: string;
};

export type FixtureChannelDefinition = {
  name: string;
  type: "intensity" | "color" | "effect" | "position" | (string & {});
  minValue: number;
  maxValue: number;
  defaultValue: number;
  reference?: ActiveChannel; // Optional reference to an active channel
};

export type WidgetConfiguration = {
  type: "lightMover" | "colorPicker" | "dimmerSlider" | (string & {});
  name: string;
  channels: {
    [key: string]: string; // Maps widget property to channel name
  };
};

export type FixtureDefinition = {
  id: string;
  name: string;
  channels: FixtureChannelDefinition[];
  widgets?: WidgetConfiguration[];
};

export type FixtureChannelWithReference = FixtureChannelDefinition & {
  reference: ActiveChannel;
};

export type ShowfileFixtureMapped = {
  fixtureName: string;
  def: FixtureDefinition & {
    channels: FixtureChannelWithReference[];
  };
};

export type RecordedFrame = {
  name: string;
  type: 'channels' | 'delay';
  channels: ActiveChannel[];
  delayDuration?: number; // Optional delay duration in milliseconds
  duration?: number; // Duration of this frame in milliseconds
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce' | 'elastic';
}

export type CueLayer = {
  id: string;
  name: string;
  frames: RecordedFrame[];
  enabled: boolean;
  opacity: number; // 0-1 for blending
  blendMode: 'replace' | 'add' | 'multiply' | 'screen';
  solo: boolean;
}

export type Cue = {
  id: string;
  name: string;
  description?: string;
  layers: CueLayer[];
  totalDuration: number; // Total duration in milliseconds
  isLooping: boolean;
  fadeInDuration: number;
  fadeOutDuration: number;
  priority: number; // Higher priority cues override lower ones
  tags: string[];
  created: Date;
  modified: Date;
}

export type CuePlaybackState = {
  cueId: string;
  startTime: number;
  currentTime: number;
  isPlaying: boolean;
  isPaused: boolean;
  playbackRate: number; // 1.0 = normal speed
  fadeProgress: number; // 0-1 for fade in/out
  intensity?: number; // 0-1 for show mode intensity control
}
