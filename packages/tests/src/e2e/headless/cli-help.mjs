/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('headless: cli help is available', () => {
  const result = spawnSync(process.execPath, ['../client/scripts/softdmx-cli.mjs', 'help'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SoftDMX CLI/);
  assert.match(result.stdout, /load-show/);
  assert.match(result.stdout, /set-channel/);
});
