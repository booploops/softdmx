/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { CommandContextSnapshot } from 'src/stores/command-context';
import type { useShowStore } from 'src/stores/show';
import type { useSelectionStore } from 'src/stores/selection';
import type { useTimelineEditorStore } from 'src/stores/timeline-editor';
import type { useOutputEngineStore } from 'src/stores/output-playback';
import type { useExecutorStore } from 'src/stores/executor';
import type { useScratchStore } from 'src/stores/scratch';
import { emitRemoteCueCommand, emitRemotePresetCommand } from './remote-command-executor';
import { COMMAND_DEFINITIONS, parseCommandLine } from './command-line';

export type CommandToken = {
  value: string;
  start: number;
  end: number;
};

export type CommandDiagnostic = {
  code: string;
  message: string;
  start: number;
  end: number;
  severity: 'error' | 'warning';
};

export type SelectionAst = {
  kind: 'selectionAt';
  expression: string[];
  value: number;
};

export type VerbAst = {
  kind: 'verb';
  verb: 'record' | 'update' | 'edit' | 'copy' | 'move' | 'delete' | 'label' | 'time';
  args: string[];
};

export type TimelineAst = {
  kind: 'timeline';
  command: 'add-marker' | 'add-section' | 'nudge-marker' | 'seek' | 'quantize';
  args: string[];
};

export type AudioAst = {
  kind: 'audio';
  command: 'bind' | 'unbind';
  args: string[];
};

export type SpatialAst = {
  kind: 'spatial';
  command: 'align' | 'distribute' | 'mirror' | 'zone';
  args: string[];
};

export type IntentAst = {
  kind: 'intent';
  original: string;
  canonical: string;
};

export type MacroAst = {
  kind: 'macro';
  name: string;
  args: string[];
};

export type LegacyAst = {
  kind: 'legacy';
  command: string;
  args: string[];
};

export type CommandAst = SelectionAst | VerbAst | TimelineAst | AudioAst | SpatialAst | IntentAst | MacroAst | LegacyAst;

export type ExecutionPlan = {
  kind: CommandAst['kind'];
  summary: string;
  risky: boolean;
  apply: () => string;
  tags: string[];
  canonicalInput: string;
};

export type MacroDefinition = {
  id: string;
  name: string;
  template: string;
  params: string[];
};

export type CommandPack = {
  id: string;
  name: string;
  macros: MacroDefinition[];
};

type ExecutionDeps = {
  context: CommandContextSnapshot;
  showStore: ReturnType<typeof useShowStore>;
  selectionStore: ReturnType<typeof useSelectionStore>;
  timelineStore: ReturnType<typeof useTimelineEditorStore>;
  outputStore: ReturnType<typeof useOutputEngineStore>;
  executorStore: ReturnType<typeof useExecutorStore>;
  scratchStore: ReturnType<typeof useScratchStore>;
  socket: {
    connected: boolean;
    emit: (event: string, payload?: unknown) => void;
  };
};

const MACROS_KEY = 'softdmx.command_macros_v2';
const PACKS_KEY = 'softdmx.command_packs_v2';

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? 'null') as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function listMacros(): MacroDefinition[] {
  return safeRead<MacroDefinition[]>(MACROS_KEY, []);
}

export function saveMacro(macro: MacroDefinition): MacroDefinition[] {
  const next = [macro, ...listMacros().filter((item) => item.name !== macro.name)].slice(0, 100);
  safeWrite(MACROS_KEY, next);
  return next;
}

export function listCommandPacks(): CommandPack[] {
  return safeRead<CommandPack[]>(PACKS_KEY, []);
}

export function saveCommandPack(pack: CommandPack): CommandPack[] {
  const next = [pack, ...listCommandPacks().filter((item) => item.id !== pack.id)].slice(0, 30);
  safeWrite(PACKS_KEY, next);
  return next;
}

export function tokenizeCommand(input: string): CommandToken[] {
  const tokens: CommandToken[] = [];
  const re = /"[^"]*"|\S+/g;
  for (const match of input.matchAll(re)) {
    const value = match[0] ?? '';
    const start = match.index ?? 0;
    tokens.push({ value: value.replace(/^"(.*)"$/, '$1'), start, end: start + value.length });
  }
  return tokens;
}

function looksLikeIntent(input: string) {
  return /\b(wash|stage|blue|red|green|over|seconds?|sec)\b/i.test(input);
}

export function parseIntentToCanonical(input: string): string | null {
  const wash = input.match(/wash\s+stage\s+(left|right|center)\s+in\s+([a-z]+)\s+over\s+(\d+(?:\.\d+)?)s?/i);
  if (!wash) return null;
  const side = wash[1]?.toLowerCase();
  const seconds = wash[3];
  if (side === 'left') return `zone stage-left @ full time ${seconds}`;
  if (side === 'right') return `zone stage-right @ full time ${seconds}`;
  return `zone stage-center @ full time ${seconds}`;
}

export function parseCommandLineV2(
  input: string,
  options?: { intentEnabled?: boolean; knownMacros?: MacroDefinition[] }
): { ast: CommandAst | null; diagnostics: CommandDiagnostic[]; tokens: CommandToken[]; canonicalInput: string } {
  const trimmed = input.trim();
  const tokens = tokenizeCommand(trimmed);
  const diagnostics: CommandDiagnostic[] = [];
  if (!trimmed) {
    return { ast: null, diagnostics, tokens, canonicalInput: trimmed };
  }

  let effective = trimmed;
  if (options?.intentEnabled && looksLikeIntent(trimmed)) {
    const canonical = parseIntentToCanonical(trimmed);
    if (canonical) {
      return {
        ast: { kind: 'intent', original: trimmed, canonical },
        diagnostics,
        tokens,
        canonicalInput: canonical,
      };
    }
  }

  const macroName = tokens[0]?.value.toLowerCase();
  const macro = options?.knownMacros?.find((item) => item.name.toLowerCase() === macroName);
  if (macro) {
    return {
      ast: {
        kind: 'macro',
        name: macro.name,
        args: tokens.slice(1).map((token) => token.value),
      },
      diagnostics,
      tokens,
      canonicalInput: trimmed,
    };
  }

  const atIndex = tokens.findIndex((token) => token.value === '@');
  if (atIndex > 0) {
    const valueToken = tokens[atIndex + 1];
    const numeric = Number(valueToken?.value?.toLowerCase() === 'full' ? '100' : valueToken?.value);
    if (!Number.isFinite(numeric)) {
      diagnostics.push({
        code: 'invalid-value',
        message: 'Expected numeric value after @.',
        start: valueToken?.start ?? tokens[atIndex].end,
        end: valueToken?.end ?? tokens[atIndex].end,
        severity: 'error',
      });
      return { ast: null, diagnostics, tokens, canonicalInput: effective };
    }
    return {
      ast: {
        kind: 'selectionAt',
        expression: tokens.slice(0, atIndex).map((token) => token.value),
        value: numeric,
      },
      diagnostics,
      tokens,
      canonicalInput: effective,
    };
  }

  const head = tokens[0]?.value.toLowerCase();
  const args = tokens.slice(1).map((token) => token.value);
  if (!head) return { ast: null, diagnostics, tokens, canonicalInput: effective };

  if (['record', 'update', 'edit', 'copy', 'move', 'delete', 'label', 'time'].includes(head)) {
    return {
      ast: { kind: 'verb', verb: head as VerbAst['verb'], args },
      diagnostics,
      tokens,
      canonicalInput: effective,
    };
  }
  if (head === 'timeline') {
    const cmd = (args[0] ?? '').toLowerCase();
    const mapped: TimelineAst['command'] | null =
      cmd === 'marker'
        ? 'add-marker'
        : cmd === 'section'
          ? 'add-section'
          : cmd === 'nudge'
            ? 'nudge-marker'
            : cmd === 'seek'
              ? 'seek'
              : cmd === 'quantize'
                ? 'quantize'
                : null;
    if (mapped) {
      return {
        ast: { kind: 'timeline', command: mapped, args: args.slice(1) },
        diagnostics,
        tokens,
        canonicalInput: effective,
      };
    }
  }
  if (head === 'audio') {
    const cmd = (args[0] ?? '').toLowerCase();
    if (cmd === 'bind' || cmd === 'unbind') {
      return {
        ast: { kind: 'audio', command: cmd, args: args.slice(1) },
        diagnostics,
        tokens,
        canonicalInput: effective,
      };
    }
  }
  if (head === 'align' || head === 'distribute' || head === 'mirror' || head === 'zone') {
    return {
      ast: { kind: 'spatial', command: head as SpatialAst['command'], args },
      diagnostics,
      tokens,
      canonicalInput: effective,
    };
  }

  const legacy = parseCommandLine(effective);
  return {
    ast: {
      kind: 'legacy',
      command: legacy.command,
      args: legacy.args,
    },
    diagnostics,
    tokens,
    canonicalInput: effective,
  };
}

function fixtureNameMap(deps: ExecutionDeps): Map<number, string> {
  return new Map(deps.showStore.document.fixtures.map((fixture, index) => [index + 1, fixture.name]));
}

function resolveSelectionNumbers(tokens: string[]): number[] {
  const result = new Set<number>();
  let mode: 'add' | 'remove' = 'add';
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index]?.toLowerCase();
    if (token === '+') {
      mode = 'add';
      index += 1;
      continue;
    }
    if (token === '-') {
      mode = 'remove';
      index += 1;
      continue;
    }
    const next = tokens[index + 1]?.toLowerCase();
    if (next === 'thru') {
      const start = Number(tokens[index]);
      const end = Number(tokens[index + 2]);
      if (Number.isFinite(start) && Number.isFinite(end)) {
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        for (let n = min; n <= max; n += 1) {
          if (mode === 'add') result.add(n);
          else result.delete(n);
        }
      }
      index += 3;
      continue;
    }
    const asNumber = Number(tokens[index]);
    if (Number.isFinite(asNumber)) {
      if (mode === 'add') result.add(asNumber);
      else result.delete(asNumber);
    }
    index += 1;
  }
  return Array.from(result).sort((a, b) => a - b);
}

export function buildExecutionPlan(ast: CommandAst, deps: ExecutionDeps, canonicalInput: string): ExecutionPlan {
  if (ast.kind === 'intent') {
    return {
      kind: 'intent',
      summary: `Intent translated to: ${ast.canonical}`,
      risky: false,
      tags: ['intent'],
      canonicalInput,
      apply: () => `Intent compiled: ${ast.canonical}`,
    };
  }

  if (ast.kind === 'macro') {
    const macro = listMacros().find((item) => item.name === ast.name);
    return {
      kind: 'macro',
      summary: `Run macro ${ast.name}`,
      risky: false,
      tags: ['macro'],
      canonicalInput,
      apply: () => {
        if (!macro) throw new Error(`Macro "${ast.name}" not found.`);
        let expanded = macro.template;
        macro.params.forEach((param, idx) => {
          expanded = expanded.replaceAll(`{${param}}`, ast.args[idx] ?? '');
        });
        return `Macro expanded to: ${expanded}`;
      },
    };
  }

  if (ast.kind === 'selectionAt') {
    const numberMap = fixtureNameMap(deps);
    const numbers = resolveSelectionNumbers(ast.expression);
    const fixtureNames = numbers.map((num) => numberMap.get(num)).filter((value): value is string => Boolean(value));
    return {
      kind: 'selectionAt',
      summary: `Select ${fixtureNames.length} fixtures @ ${ast.value}`,
      risky: false,
      tags: ['selection', 'level'],
      canonicalInput,
      apply: () => {
        deps.selectionStore.clearSelection();
        fixtureNames.forEach((name) => deps.selectionStore.selectFixture(name));
        const channelValue = Math.round(Math.max(0, Math.min(100, ast.value)) * 2.55);
        fixtureNames.forEach((name) => {
          deps.scratchStore.setChannel(`${name}.intensity`, channelValue, 'intensity');
        });
        return `Selected ${fixtureNames.length} fixtures at ${Math.round(ast.value)}%.`;
      },
    };
  }

  if (ast.kind === 'verb') {
    return {
      kind: 'verb',
      summary: `${ast.verb.toUpperCase()} ${ast.args.join(' ')}`,
      risky: ['delete', 'move'].includes(ast.verb),
      tags: ['verb', ast.verb],
      canonicalInput,
      apply: () => {
        const cueId = deps.context.activeCueId;
        if (ast.verb === 'record') {
          const id = deps.timelineStore.ensureTimelineCue(ast.args[0] ?? 'Recorded Cue');
          deps.timelineStore.setSelectedCue(id);
          return `Recorded cue ${id}.`;
        }
        if (ast.verb === 'update') {
          if (!cueId) throw new Error('No active cue selected for update.');
          deps.timelineStore.assignCueTimecodeOut(cueId, deps.timelineStore.playheadMs / 1000);
          return `Updated cue ${cueId}.`;
        }
        if (ast.verb === 'edit') {
          const target = ast.args[0];
          if (!target) throw new Error('Usage: edit <cue-id>');
          deps.timelineStore.setSelectedCue(target);
          return `Editing cue ${target}.`;
        }
        if (ast.verb === 'copy') {
          return `Copy prepared for ${ast.args.join(' ') || 'selection'}.`;
        }
        if (ast.verb === 'move') {
          return `Move prepared for ${ast.args.join(' ') || 'selection'}.`;
        }
        if (ast.verb === 'delete') {
          deps.selectionStore.clearSelection();
          return 'Selection cleared (delete safety fallback).';
        }
        if (ast.verb === 'label') {
          const [target, ...labelParts] = ast.args;
          const label = labelParts.join(' ');
          if (!target || !label) throw new Error('Usage: label <cue-id> <name>');
          deps.showStore.updateDocument((doc) => {
            const cue = doc.cues.find((item) => item.id === target);
            if (cue) cue.name = label;
          });
          return `Labeled ${target} as "${label}".`;
        }
        if (ast.verb === 'time') {
          const [value] = ast.args;
          const sec = Number(value);
          const cue = deps.context.activeCueId;
          if (!cue || !Number.isFinite(sec)) throw new Error('Usage: time <seconds> (active cue required)');
          deps.timelineStore.assignCueTimecodeOut(cue, deps.timelineStore.playheadMs / 1000 + sec);
          return `Set cue ${cue} timing to ${sec}s from playhead.`;
        }
        return 'Verb executed.';
      },
    };
  }

  if (ast.kind === 'timeline') {
    return {
      kind: 'timeline',
      summary: `Timeline ${ast.command}`,
      risky: false,
      tags: ['timeline'],
      canonicalInput,
      apply: () => {
        if (ast.command === 'add-marker') {
          const name = ast.args[0] ?? `Marker ${deps.timelineStore.markers.length + 1}`;
          deps.timelineStore.addMarker(name, deps.timelineStore.playheadMs / 1000);
          return `Added marker "${name}".`;
        }
        if (ast.command === 'add-section') {
          const name = ast.args[0] ?? `Section ${deps.timelineStore.sections.length + 1}`;
          const start = Number(ast.args[1] ?? deps.timelineStore.playheadMs / 1000);
          const end = Number(ast.args[2] ?? start + 4);
          deps.timelineStore.addSection(name, start, end);
          return `Added section "${name}".`;
        }
        if (ast.command === 'nudge-marker') {
          const delta = Number(ast.args[0] ?? '0');
          const first = deps.timelineStore.markers[0];
          if (!first || !Number.isFinite(delta)) throw new Error('Usage: timeline nudge <deltaSec>');
          deps.showStore.updateDocument((doc) => {
            const marker = doc.timeline?.markers?.find((item) => item.id === first.id);
            if (marker) marker.timeSec = Math.max(0, marker.timeSec + delta);
          });
          return `Nudged marker "${first.name}" by ${delta}s.`;
        }
        if (ast.command === 'seek') {
          const sec = Number(ast.args[0] ?? '0');
          if (!Number.isFinite(sec)) throw new Error('Usage: timeline seek <seconds>');
          deps.timelineStore.seekToMs(sec * 1000);
          return `Seeked timeline to ${sec}s.`;
        }
        deps.showStore.updateDocument((doc) => {
          if (!doc.timeline) return;
          doc.timeline.snapEnabled = true;
          doc.timeline.snapMode = 'frames';
        });
        return 'Timeline quantize mode set to frames.';
      },
    };
  }

  if (ast.kind === 'audio') {
    return {
      kind: 'audio',
      summary: `Audio ${ast.command}`,
      risky: false,
      tags: ['audio'],
      canonicalInput,
      apply: () => {
        if (ast.command === 'unbind') {
          const targetId = ast.args[0];
          deps.showStore.updateDocument((doc) => {
            doc.audioMappings = (doc.audioMappings ?? []).filter((mapping) => mapping.targetId !== targetId);
          });
          return `Removed audio mappings for ${targetId ?? 'target'}.`;
        }
        const targetId = ast.args[0] ?? deps.context.selectedFixtures[0];
        if (!targetId) throw new Error('Usage: audio bind <targetId> [source]');
        const source = (ast.args[1] as 'rms' | 'peak' | 'beat' | 'band' | undefined) ?? 'beat';
        deps.showStore.updateDocument((doc) => {
          doc.audioMappings = doc.audioMappings ?? [];
          doc.audioMappings.push({
            id: `audio-map-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            source,
            targetType: 'fixture',
            targetId,
            attribute: 'intensity',
            gain: 1,
            offset: 0,
            enabled: true,
            min: 0,
            max: 255,
          });
        });
        return `Bound audio ${source} to ${targetId}.`;
      },
    };
  }

  if (ast.kind === 'spatial') {
    return {
      kind: 'spatial',
      summary: `${ast.command} ${ast.args.join(' ')}`,
      risky: ast.command === 'mirror',
      tags: ['spatial'],
      canonicalInput,
      apply: () => {
        const selected = deps.context.selectedFixtures.length
          ? deps.context.selectedFixtures
          : deps.showStore.document.fixtures.map((fixture) => fixture.name);
        deps.showStore.updateDocument((doc) => {
          const fixtures = doc.fixtures.filter((fixture) => selected.includes(fixture.name));
          if (fixtures.length === 0) return;
          if (ast.command === 'align') {
            const axis = (ast.args[0] ?? 'row').toLowerCase();
            if (axis === 'column') {
              const x = fixtures[0]?.position?.x ?? 0;
              fixtures.forEach((fixture) => {
                fixture.position = {
                  ...(fixture.position ?? {}),
                  x,
                };
              });
            } else {
              const y = fixtures[0]?.position?.y ?? 0;
              fixtures.forEach((fixture) => {
                fixture.position = {
                  ...(fixture.position ?? {}),
                  y,
                };
              });
            }
            return;
          }
          if (ast.command === 'distribute') {
            const spacing = Number(ast.args[0] ?? '1');
            fixtures.forEach((fixture, index) => {
              fixture.position = {
                ...(fixture.position ?? {}),
                x: index * spacing,
              };
            });
            return;
          }
          if (ast.command === 'mirror') {
            fixtures.forEach((fixture) => {
              fixture.position = {
                ...(fixture.position ?? {}),
                x: -((fixture.position?.x ?? 0)),
              };
            });
            return;
          }
          const zone = (ast.args[0] ?? 'center').toLowerCase();
          const x = zone.includes('left') ? -4 : zone.includes('right') ? 4 : 0;
          fixtures.forEach((fixture, index) => {
            fixture.position = {
              ...(fixture.position ?? {}),
              x,
              y: index,
            };
          });
        });
        return `${ast.command} applied to ${selected.length} fixtures.`;
      },
    };
  }

  return {
    kind: 'legacy',
    summary: ast.command,
    risky: false,
    tags: ['legacy'],
    canonicalInput,
    apply: () => {
      switch (ast.command) {
        case 'help':
          return COMMAND_DEFINITIONS.map((cmd) => `${cmd.usage} - ${cmd.description}`).join('\n');
        case 'blackout': {
          const off = ast.args.includes('--off');
          deps.outputStore.setBlackout(!off);
          return off ? 'Blackout disabled' : 'Blackout enabled';
        }
        case 'fire-preset': {
          const presetId = ast.args.find((arg) => !arg.startsWith('--'));
          if (!presetId) throw new Error('Missing preset ID');
          const fadeIndex = ast.args.indexOf('--fade');
          const fade = fadeIndex >= 0 ? Number(ast.args[fadeIndex + 1]) : undefined;
          return emitRemotePresetCommand(deps.socket, presetId, fade);
        }
        case 'play-cue': {
          const cueId = ast.args.find((arg) => !arg.startsWith('--'));
          if (!cueId) throw new Error('Missing cue ID');
          const stop = ast.args.includes('--stop');
          return emitRemoteCueCommand(deps.socket, cueId, stop);
        }
        case 'set-channel': {
          const path = ast.args[0];
          const value = Number(ast.args[1]);
          if (!path || !Number.isFinite(value)) throw new Error('Usage: set-channel <path> <value>');
          deps.scratchStore.setChannel(path, Math.max(0, Math.min(255, Math.round(value))), 'generic');
          return `Set ${path} to ${value}`;
        }
        case 'clear':
          deps.scratchStore.clear();
          return 'Programmer cleared';
        case 'go':
          deps.executorStore.goActive();
          return 'Go+';
        case 'stop':
          deps.executorStore.stopAll();
          return 'All playback stopped';
        default:
          throw new Error(`Unknown command "${ast.command}". Type "help" for available commands.`);
      }
    },
  };
}

export function suggestCommands(
  input: string,
  context: CommandContextSnapshot,
  history: Array<{ input: string }>,
): string[] {
  const seed = [
    'help',
    'go',
    'stop',
    'timeline marker Intro',
    'timeline section Verse 0 16',
    'audio bind fixture-1 beat',
    'align row',
    'distribute 1',
    'record',
    'update',
  ];
  if (context.mode === 'timeline') {
    seed.unshift('timeline seek 0', 'timeline quantize');
  }
  if (context.selectedFixtures.length > 0) {
    seed.unshift('label');
  }
  for (const item of history.slice(0, 5)) {
    seed.unshift(item.input);
  }
  const q = input.trim().toLowerCase();
  if (!q) return Array.from(new Set(seed)).slice(0, 12);
  return Array.from(new Set(seed)).filter((entry) => entry.toLowerCase().includes(q)).slice(0, 12);
}
