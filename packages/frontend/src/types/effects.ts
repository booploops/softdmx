/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export interface EffectTarget {
  fixtures?: string[];
  group?: string;
  attr: string;
}

export interface EffectDefinitionBase {
  id: string;
  name: string;
  enabled: boolean;
  target: EffectTarget;
  sync?: 'free' | 'link';
}

export interface SineEffect extends EffectDefinitionBase {
  type: 'sine';
  rate: number;
  depth: number;
  offset?: number;
}

export interface SawEffect extends EffectDefinitionBase {
  type: 'saw';
  rate: number;
  min: number;
  max: number;
}

export interface StepEffect extends EffectDefinitionBase {
  type: 'step';
  rate: number;
  steps: number[];
}

export interface ChaseEffect extends EffectDefinitionBase {
  type: 'chase';
  rate: number;
  width: number;
  direction: 'forward' | 'reverse';
  wings?: number;
}

export interface PhaserEffect extends EffectDefinitionBase {
  type: 'phaser';
  rate: number;
  depth: number;
  offset?: number;
  phaseSpread?: number;
  waveform?: 'sine' | 'triangle' | 'square';
  wings?: number;
  spread?: 'linear' | 'random' | 'reverse';
}

export interface RandomHoldEffect extends EffectDefinitionBase {
  type: 'random_hold';
  rate: number;
  min: number;
  max: number;
  seed?: number;
}

export type EffectDefinition =
  | SineEffect
  | SawEffect
  | StepEffect
  | ChaseEffect
  | PhaserEffect
  | RandomHoldEffect;
