/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ActiveChannel } from './index';
import type { PresetTarget } from '../show/document.ts';

export type EasingType =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'bounce'
  | 'elastic';

export interface RecordedFrame {
  name: string;
  type: 'channels' | 'delay' | 'preset';
  channels?: ActiveChannel[];
  presetId?: string;
  delayDuration?: number;
  duration?: number;
  easing?: EasingType;
}

export interface CueLayer {
  id: string;
  name: string;
  frames: RecordedFrame[];
  enabled: boolean;
  opacity: number;
  blendMode: 'replace' | 'add' | 'multiply' | 'screen';
  solo: boolean;
}

export interface StackStep {
  id: string;
  label?: string;
  presetId?: string;
  effectIds?: string[];
  fadeIn: number;
  fadeOut?: number;
  follow: 'manual' | 'auto' | 'timed';
  followTime?: number;
}

export interface CuePart {
  id: string;
  label?: string;
  fadeIn?: number;
  delay?: number;
  tracking?: boolean;
  block?: boolean;
  presetId?: string;
  targets?: PresetTarget[];
  effectIds?: string[];
}

export interface Cue {
  id: string;
  name: string;
  description?: string;
  timecodeIn?: number;
  timecodeOut?: number;
  view: 'timeline' | 'stack';
  tracking?: boolean;
  block?: boolean;
  mib?: boolean;
  layers?: CueLayer[];
  stack?: StackStep[];
  parts?: CuePart[];
  totalDuration: number;
  isLooping: boolean;
  fadeInDuration: number;
  fadeOutDuration: number;
  priority: number;
  tags: string[];
  created: string;
  modified: string;
}

export interface CuePlaybackState {
  cueId: string;
  startTime: number;
  currentTime: number;
  isPlaying: boolean;
  isPaused: boolean;
  playbackRate: number;
  fadeProgress: number;
  intensity?: number;
  targetIntensity?: number;
  fadeInMs?: number;
  fadeInStartTime?: number;
  releaseStartTime?: number;
  releaseMs?: number;
  releaseFromIntensity?: number;
  stackStepIndex?: number;
  stackStepStartTime?: number;
}
