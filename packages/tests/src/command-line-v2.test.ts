/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import {
  parseCommandLineV2,
  parseIntentToCanonical,
  suggestCommands,
  tokenizeCommand,
  type CommandAst,
} from '../../frontend/src/lib/command-line-v2.ts';
import { evaluateCommandPolicy } from '../../frontend/src/lib/command-policy.ts';

console.log('Running test: tokenization handles quoted strings');
{
  const tokens = tokenizeCommand('label cue-1 "Main Intro"');
  assert.deepEqual(tokens.map((entry) => entry.value), ['label', 'cue-1', 'Main Intro']);
}

console.log('Running test: selection syntax parses to selectionAt AST');
{
  const parsed = parseCommandLineV2('1 Thru 5 - 2 @ 50');
  assert.equal(parsed.ast?.kind, 'selectionAt');
  const ast = parsed.ast as CommandAst & { kind: 'selectionAt' };
  assert.equal(ast.value, 50);
  assert.deepEqual(ast.expression, ['1', 'Thru', '5', '-', '2']);
}

console.log('Running test: intent phrase compiles to canonical command');
{
  const canonical = parseIntentToCanonical('wash stage left in blue over 3s');
  assert.equal(canonical, 'zone stage-left @ full time 3');
}

console.log('Running test: parser returns intent AST when enabled');
{
  const parsed = parseCommandLineV2('wash stage left in blue over 3s', {
    intentEnabled: true,
  });
  assert.equal(parsed.ast?.kind, 'intent');
}

console.log('Running test: show-aware suggestions include timeline hints');
{
  const suggestions = suggestCommands(
    'timeline',
    {
      mode: 'timeline',
      operateLocked: false,
      selectedFixtures: [],
      selectedGroups: [],
      activeCueId: null,
      playheadMs: 0,
      timelineMarkers: 0,
      timelineSections: 0,
      fixtureCount: 0,
      scratchActive: false,
      showName: 'Test',
    },
    [{ input: 'go' }],
  );
  assert.ok(suggestions.some((entry) => entry.includes('timeline')));
}

console.log('Running test: command policy blocks delete-like operations while locked');
{
  const decision = evaluateCommandPolicy(
    {
      kind: 'verb',
      summary: 'DELETE cue',
      risky: true,
      apply: () => 'ok',
      tags: ['delete'],
      canonicalInput: 'delete cue-1',
    },
    { operateLocked: true, isDeleteLike: true },
  );
  assert.equal(decision.action, 'block');
}

console.log('All command line v2 tests passed.');
