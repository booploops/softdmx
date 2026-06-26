<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useIOClient } from 'src/lib/io-client';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useExecutorStore } from 'src/stores/executor';
import { useChannelControl } from 'src/composables/useChannelControl';
import { useUIStore } from 'src/stores/ui';
import {
  autocompleteCommand,
  parseCommandLine,
  COMMAND_DEFINITIONS,
} from 'src/lib/command-line';
import {
  emitRemoteCueCommand,
  emitRemotePresetCommand,
} from 'src/lib/remote-command-executor';
import { SdmxButton } from 'src/components/ui';

const ui = useUIStore();
const socket = useIOClient();
const output = useOutputEngineStore();
const executor = useExecutorStore();
const { clearScratch } = useChannelControl();

const input = ref('');
const history = ref<string[]>([]);
const historyIndex = ref(-1);
const message = ref('');
const messageType = ref<'info' | 'error' | 'success'>('info');
const inputRef = ref<HTMLInputElement | null>(null);

const suggestions = computed(() => autocompleteCommand(input.value).slice(0, 8));

watch(
  () => ui.commandLineOpen,
  (open) => {
    if (open) {
      nextTick(() => inputRef.value?.focus());
    }
  }
);

async function execute(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return;

  history.value = [trimmed, ...history.value.filter((entry) => entry !== trimmed)].slice(0, 50);
  historyIndex.value = -1;

  const { command, args } = parseCommandLine(trimmed);

  try {
    switch (command) {
      case 'help':
        message.value = COMMAND_DEFINITIONS.map((cmd) => `${cmd.usage} — ${cmd.description}`).join('\n');
        messageType.value = 'info';
        break;
      case 'blackout': {
        const off = args.includes('--off');
        output.setBlackout(!off);
        message.value = off ? 'Blackout disabled' : 'Blackout enabled';
        messageType.value = 'success';
        break;
      }
      case 'fire-preset': {
        const presetId = args.find((arg) => !arg.startsWith('--'));
        if (!presetId) throw new Error('Missing preset ID');
        const fadeIndex = args.indexOf('--fade');
        const fade = fadeIndex >= 0 ? Number(args[fadeIndex + 1]) : undefined;
        message.value = emitRemotePresetCommand(socket, presetId, fade);
        messageType.value = 'success';
        break;
      }
      case 'play-cue': {
        const cueId = args.find((arg) => !arg.startsWith('--'));
        if (!cueId) throw new Error('Missing cue ID');
        const stop = args.includes('--stop');
        message.value = emitRemoteCueCommand(socket, cueId, stop);
        messageType.value = 'success';
        break;
      }
      case 'set-channel': {
        const path = args[0];
        const value = Number(args[1]);
        if (!path || !Number.isFinite(value)) throw new Error('Usage: set-channel <path> <value>');
        socket.emit('scratch:set', {
          path,
          value: Math.max(0, Math.min(255, Math.round(value))),
          attributeType: 'generic',
        });
        message.value = `Set ${path} to ${value}`;
        messageType.value = 'success';
        break;
      }
      case 'clear':
        clearScratch();
        message.value = 'Programmer cleared';
        messageType.value = 'success';
        break;
      case 'go':
        executor.goActive();
        message.value = 'Go+';
        messageType.value = 'success';
        break;
      case 'stop':
        executor.stopAll();
        message.value = 'All playback stopped';
        messageType.value = 'success';
        break;
      default:
        throw new Error(`Unknown command "${command}". Type "help" for available commands.`);
    }
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error);
    messageType.value = 'error';
  }

  input.value = '';
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    execute(input.value);
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    ui.toggleCommandLine(false);
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (history.value.length === 0) return;
    historyIndex.value = Math.min(historyIndex.value + 1, history.value.length - 1);
    input.value = history.value[historyIndex.value] ?? '';
    return;
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    historyIndex.value = Math.max(historyIndex.value - 1, -1);
    input.value = historyIndex.value >= 0 ? (history.value[historyIndex.value] ?? '') : '';
    return;
  }
  if (event.key === 'Tab') {
    event.preventDefault();
    const first = suggestions.value[0];
    if (first) {
      const parts = input.value.trim().split(/\s+/);
      if (parts.length <= 1) {
        input.value = `${first} `;
      } else {
        parts[parts.length - 1] = first;
        input.value = `${parts.join(' ')} `;
      }
    }
  }
}

function applySuggestion(suggestion: string) {
  const parts = input.value.trim().split(/\s+/);
  if (parts.length <= 1) {
    input.value = `${suggestion} `;
  } else {
    parts[parts.length - 1] = suggestion;
    input.value = `${parts.join(' ')} `;
  }
  inputRef.value?.focus();
}
</script>

<template>
  <div v-if="ui.commandLineOpen" class="command-line-bar" role="region" aria-label="Command line">
    <div class="command-line-bar__input-row">
      <span class="command-line-bar__prompt sdmx-text-mono">&gt;</span>
      <input
        ref="inputRef"
        v-model="input"
        type="text"
        class="command-line-bar__input sdmx-text-mono sdmx-focus-ring"
        placeholder="Type a command (help for list)…"
        spellcheck="false"
        autocomplete="off"
        aria-label="Command input"
        @keydown="onKeydown"
      />
      <SdmxButton icon="close" variant="ghost" size="sm" info="Close command line" @click="ui.toggleCommandLine(false)" />
    </div>
    <div v-if="suggestions.length && input" class="command-line-bar__suggestions">
      <button
        v-for="suggestion in suggestions"
        :key="suggestion"
        type="button"
        class="command-line-bar__suggestion sdmx-focus-ring"
        @click="applySuggestion(suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>
    <pre
      v-if="message"
      class="command-line-bar__message sdmx-text-mono"
      :class="`command-line-bar__message--${messageType}`"
    >{{ message }}</pre>
  </div>
</template>

<style scoped>
.command-line-bar {
  flex-shrink: 0;
  border-top: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-drawer);
  padding: var(--sdmx-space-sm);
}

.command-line-bar__input-row {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
}

.command-line-bar__prompt {
  color: var(--sdmx-color-primary);
  font-weight: var(--sdmx-font-weight-bold);
}

.command-line-bar__input {
  flex: 1 1 auto;
  background: var(--sdmx-color-bg-inset);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  color: var(--sdmx-color-text);
  font-size: var(--sdmx-font-size-mono);
  min-height: var(--sdmx-space-touch);
}

.command-line-bar__suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sdmx-space-xs);
  margin-top: var(--sdmx-space-xs);
}

.command-line-bar__suggestion {
  padding: 2px var(--sdmx-space-sm);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  background: var(--sdmx-color-bg-surface);
  color: var(--sdmx-color-text-muted);
  font-size: var(--sdmx-font-size-caption);
  cursor: pointer;
}

.command-line-bar__suggestion:hover {
  background: var(--sdmx-color-hover);
  color: var(--sdmx-color-text);
}

.command-line-bar__message {
  margin: var(--sdmx-space-xs) 0 0;
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  font-size: var(--sdmx-font-size-caption);
  white-space: pre-wrap;
  border-radius: var(--sdmx-radius-sm);
}

.command-line-bar__message--error {
  color: var(--sdmx-color-negative);
  background: var(--sdmx-color-negative-soft);
}

.command-line-bar__message--success {
  color: var(--sdmx-color-positive);
}

.command-line-bar__message--info {
  color: var(--sdmx-color-text-muted);
}
</style>
