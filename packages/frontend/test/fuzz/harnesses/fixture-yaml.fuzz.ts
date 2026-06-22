/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { loadFixtureYaml } from '../../../src/fixture-library/fixture-yaml.ts';

export function fuzzFixtureYaml(input: string): void {
  try {
    loadFixtureYaml(input);
  } catch {
    // schema validation errors are expected for arbitrary input
  }
}

export function fuzz(data: Buffer): void {
  fuzzFixtureYaml(data.toString('utf8'));
}
