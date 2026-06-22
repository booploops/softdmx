/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { parseShowDocument } from '../../../src/show/io.ts';

export function fuzzShowYaml(input: string): void {
  try {
    parseShowDocument(input);
  } catch {
    // validation and parse errors are expected for arbitrary input
  }
}

export function fuzz(data: Buffer): void {
  fuzzShowYaml(data.toString('utf8'));
}
