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
import { useUIStore } from 'src/stores/ui';
import { useSelectionStore } from 'src/stores/selection';
import { useTimelineEditorStore } from 'src/stores/timeline-editor';
import { useShowStore } from 'src/stores/show';
import { useScratchStore } from 'src/stores/scratch';
import { useCommandContextStore } from 'src/stores/command-context';
import { useCommandHistoryStore } from 'src/stores/command-history';
import { getCommandLineFlags, updateCommandLineFlags, type CommandLineFlags } from 'src/config/command-line-flags';
import { autocompleteCommand, parseCommandLine } from 'src/lib/command-line';
import {
  parseCommandLineV2,
  buildExecutionPlan,
  suggestCommands,
  listMacros,
  saveMacro,
  saveCommandPack,
  listCommandPacks,
  type ExecutionPlan,
} from 'src/lib/command-line-v2';
import { evaluateCommandPolicy } from 'src/lib/command-policy';
import { SdmxButton } from 'src/components/ui';

const ui = useUIStore();
const socket = useIOClient();
const output = useOutputEngineStore();
const executor = useExecutorStore();
const selection = useSelectionStore();
const timeline = useTimelineEditorStore();
const showStore = useShowStore();
const scratch = useScratchStore();
const contextStore = useCommandContextStore();
const historyStore = useCommandHistoryStore();

const input = ref('');
const historyIndex = ref(-1);
const message = ref('');
const messageType = ref<'info' | 'error' | 'success'>('info');
const inputRef = ref<HTMLInputElement | null>(null);
const pendingPlan = ref<ExecutionPlan | null>(null);
const showHistoryBrowser = ref(false);
const showAdvancedControls = ref(false);
const flags = ref<CommandLineFlags>(getCommandLineFlags());

const parserState = computed(() =>
  flags.value.commandLineV2Enabled
    ? parseCommandLineV2(input.value, {
      intentEnabled: flags.value.commandIntentEnabled,
      knownMacros: listMacros(),
    })
    : { ast: null, diagnostics: [], tokens: [], canonicalInput: input.value.trim() }
);
const diagnostics = computed(() => parserState.value.diagnostics);
const suggestions = computed(() => {
  if (!flags.value.commandSuggestionsEnabled) return [];
  if (!flags.value.commandLineV2Enabled) return autocompleteCommand(input.value).slice(0, 8);
  return suggestCommands(input.value, contextStore.snapshot, historyStore.entries).slice(0, 8);
});
const selectedPlanSummary = computed(() => pendingPlan.value?.summary ?? '');
const packs = computed(() => listCommandPacks());

watch(
  () => ui.commandLineOpen,
  (open) => {
    if (open) {
      nextTick(() => inputRef.value?.focus());
    }
  }
);

function persistFlags(patch: Partial<CommandLineFlags>) {
  flags.value = updateCommandLineFlags(patch);
}

function pushAudit(plan: ExecutionPlan, success: boolean, approvedViaSandbox: boolean) {
  historyStore.addAuditEvent({
    actor: 'operator',
    input: input.value,
    planKind: plan.kind,
    risky: plan.risky,
    approvedViaSandbox,
    success,
  });
}

async function execute(raw: string, options?: { forceRiskyApply?: boolean }) {
  const trimmed = raw.trim();
  if (!trimmed) return;

  const state = flags.value.commandLineV2Enabled
    ? parseCommandLineV2(trimmed, {
      intentEnabled: flags.value.commandIntentEnabled,
      knownMacros: listMacros(),
    })
    : {
      ast: {
        kind: 'legacy' as const,
        command: parseCommandLine(trimmed).command,
        args: parseCommandLine(trimmed).args,
      },
      diagnostics: [],
      tokens: [],
      canonicalInput: trimmed,
    };
  if (!state.ast) {
    message.value = state.diagnostics[0]?.message ?? 'Unable to parse command.';
    messageType.value = 'error';
    return;
  }
  const plan = buildExecutionPlan(state.ast, {
    context: contextStore.snapshot,
    showStore,
    selectionStore: selection,
    timelineStore: timeline,
    outputStore: output,
    executorStore: executor,
    scratchStore: scratch,
    socket,
  }, state.canonicalInput);

  try {
    const policy = evaluateCommandPolicy(plan, {
      operateLocked: contextStore.snapshot.operateLocked,
      isDeleteLike: plan.tags.includes('delete'),
    });
    if (policy.action === 'block') {
      throw new Error(policy.reason ?? 'Command blocked by policy.');
    }
    if (policy.action === 'warn' && !options?.forceRiskyApply) {
      pendingPlan.value = plan;
      message.value = policy.reason ?? 'Command requires confirmation.';
      messageType.value = 'info';
      return;
    }
    if (plan.risky && flags.value.commandSandboxRequiredForRisky && !options?.forceRiskyApply) {
      pendingPlan.value = plan;
      message.value = `Preview: ${plan.summary}. Confirm to apply.`;
      messageType.value = 'info';
      historyStore.addEntry({
        input: trimmed,
        message: message.value,
        outcome: 'preview',
        tags: plan.tags,
      });
      return;
    }
    const result = plan.apply();
    pendingPlan.value = null;
    message.value = result;
    messageType.value = 'success';
    historyStore.addEntry({
      input: trimmed,
      message: result,
      outcome: 'success',
      tags: plan.tags,
    });
    pushAudit(plan, true, Boolean(options?.forceRiskyApply));
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error);
    messageType.value = 'error';
    historyStore.addEntry({
      input: trimmed,
      message: message.value,
      outcome: 'error',
      tags: ['error'],
    });
    pushAudit(plan, false, Boolean(options?.forceRiskyApply));
  }

  historyIndex.value = -1;
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
    if (historyStore.entries.length === 0) return;
    historyIndex.value = Math.min(historyIndex.value + 1, historyStore.entries.length - 1);
    input.value = historyStore.entries[historyIndex.value]?.input ?? '';
    return;
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    historyIndex.value = Math.max(historyIndex.value - 1, -1);
    input.value = historyIndex.value >= 0 ? (historyStore.entries[historyIndex.value]?.input ?? '') : '';
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

function confirmPendingPlan() {
  if (!pendingPlan.value) return;
  execute(input.value || pendingPlan.value.canonicalInput, { forceRiskyApply: true });
}

function runHistory(entry: string) {
  input.value = entry;
  execute(entry);
}

function appendHistory(entry: string) {
  input.value = `${input.value.trim()} ${entry}`.trim();
  inputRef.value?.focus();
}

function saveInlineMacro() {
  const trimmed = input.value.trim();
  if (!trimmed) return;
  const [name, ...rest] = trimmed.split(/\s+/);
  if (!name || rest.length === 0) return;
  saveMacro({
    id: `macro-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.toLowerCase(),
    template: rest.join(' '),
    params: [],
  });
  message.value = `Saved macro "${name.toLowerCase()}".`;
  messageType.value = 'success';
}

function savePackFromHistory() {
  const latest = historyStore.entries.slice(0, 5);
  if (latest.length === 0) return;
  saveCommandPack({
    id: `pack-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: `Recent ${new Date().toLocaleTimeString()}`,
    macros: latest.map((entry, idx) => ({
      id: `pack-macro-${idx}`,
      name: `recent-${idx + 1}`,
      template: entry.input,
      params: [],
    })),
  });
  message.value = 'Saved command pack from recent history.';
  messageType.value = 'success';
}

function exportChangeLog() {
  const log = historyStore.generateChangeLog(40);
  message.value = log || 'No command history available.';
  messageType.value = 'info';
}

function recoverLook() {
  const candidate = historyStore.recoverLookCandidate();
  if (!candidate) {
    message.value = 'No successful command to recover.';
    messageType.value = 'error';
    return;
  }
  input.value = candidate.input;
  execute(candidate.input, { forceRiskyApply: true });
}
</script>

<template>
  <div v-if="ui.commandLineOpen" class="command-line-bar" role="region" aria-label="Command line">
    <div class="command-line-bar__input-row">
      <span class="command-line-bar__prompt sdmx-text-mono">{{ contextStore.prompt }}</span>
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
      <SdmxButton icon="history" variant="ghost" size="sm" info="Toggle command history browser" @click="showHistoryBrowser = !showHistoryBrowser" />
      <SdmxButton icon="tune" variant="ghost" size="sm" info="Show command line controls" @click="showAdvancedControls = !showAdvancedControls" />
      <SdmxButton icon="close" variant="ghost" size="sm" info="Close command line" @click="ui.toggleCommandLine(false)" />
    </div>
    <div v-if="diagnostics.length" class="command-line-bar__diagnostics">
      <div
        v-for="diag in diagnostics"
        :key="`${diag.code}-${diag.start}`"
        class="command-line-bar__diagnostic"
      >
        {{ diag.message }}
      </div>
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
    <div v-if="pendingPlan" class="command-line-bar__preview">
      <div class="command-line-bar__preview-title sdmx-text-mono">Sandbox Preview</div>
      <div class="command-line-bar__preview-body">{{ selectedPlanSummary }}</div>
      <SdmxButton icon="verified" size="sm" variant="warning" label="Confirm Apply" @click="confirmPendingPlan" />
    </div>
    <div v-if="showAdvancedControls" class="command-line-bar__advanced">
      <label class="command-line-bar__toggle">
        <input
          type="checkbox"
          :checked="flags.commandLineV2Enabled"
          @change="persistFlags({ commandLineV2Enabled: ($event.target as HTMLInputElement).checked })"
        >
        Command Line v2
      </label>
      <label class="command-line-bar__toggle">
        <input
          type="checkbox"
          :checked="flags.commandIntentEnabled"
          @change="persistFlags({ commandIntentEnabled: ($event.target as HTMLInputElement).checked })"
        >
        Intent Commands
      </label>
      <label class="command-line-bar__toggle">
        <input
          type="checkbox"
          :checked="flags.commandSandboxRequiredForRisky"
          @change="persistFlags({ commandSandboxRequiredForRisky: ($event.target as HTMLInputElement).checked })"
        >
        Require Sandbox For Risky Plans
      </label>
      <label class="command-line-bar__toggle">
        <input
          type="checkbox"
          :checked="flags.commandSuggestionsEnabled"
          @change="persistFlags({ commandSuggestionsEnabled: ($event.target as HTMLInputElement).checked })"
        >
        Show-Aware Suggestions
      </label>
      <SdmxButton icon="save" size="sm" variant="ghost" label="Save Macro From Input" @click="saveInlineMacro" />
      <SdmxButton icon="inventory_2" size="sm" variant="ghost" label="Save Pack From Recent" @click="savePackFromHistory" />
      <SdmxButton icon="description" size="sm" variant="ghost" label="Generate Change Log" @click="exportChangeLog" />
      <SdmxButton icon="history_toggle_off" size="sm" variant="ghost" label="Recover Last Look" @click="recoverLook" />
      <div class="command-line-bar__meta">Saved packs: {{ packs.length }}</div>
    </div>
    <div v-if="showHistoryBrowser" class="command-line-bar__history">
      <div class="command-line-bar__history-head">
        <input
          v-model="historyStore.query"
          type="text"
          class="command-line-bar__history-query sdmx-text-mono"
          placeholder="Search history"
        >
        <SdmxButton icon="delete_sweep" size="sm" variant="ghost" info="Clear command history" @click="historyStore.clearHistory()" />
      </div>
      <div class="command-line-bar__history-list">
        <div
          v-for="entry in historyStore.filteredEntries.slice(0, 40)"
          :key="entry.id"
          class="command-line-bar__history-item"
        >
          <button
            type="button"
            class="command-line-bar__history-run sdmx-focus-ring sdmx-text-mono"
            @click="runHistory(entry.input)"
          >
            {{ entry.input }}
          </button>
          <SdmxButton icon="add" size="sm" variant="ghost" info="Append command to input" @click="appendHistory(entry.input)" />
        </div>
      </div>
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
  max-height: 40vh;
  overflow: auto;
}

.command-line-bar__input-row {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
}

.command-line-bar__prompt {
  color: var(--sdmx-color-primary);
  font-weight: var(--sdmx-font-weight-bold);
  white-space: nowrap;
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

.command-line-bar__diagnostics {
  margin-top: var(--sdmx-space-xs);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.command-line-bar__diagnostic {
  color: var(--sdmx-color-negative);
  font-size: var(--sdmx-font-size-caption);
}

.command-line-bar__preview {
  margin-top: var(--sdmx-space-xs);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  background: var(--sdmx-color-bg-surface);
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  display: flex;
  gap: var(--sdmx-space-sm);
  align-items: center;
}

.command-line-bar__preview-title {
  color: var(--sdmx-color-warning);
  font-size: var(--sdmx-font-size-caption);
}

.command-line-bar__preview-body {
  flex: 1 1 auto;
  font-size: var(--sdmx-font-size-caption);
  color: var(--sdmx-color-text-muted);
}

.command-line-bar__advanced {
  margin-top: var(--sdmx-space-xs);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sdmx-space-sm);
}

.command-line-bar__toggle {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: var(--sdmx-color-text-muted);
  font-size: var(--sdmx-font-size-caption);
}

.command-line-bar__meta {
  color: var(--sdmx-color-text-muted);
  font-size: var(--sdmx-font-size-caption);
}

.command-line-bar__history {
  margin-top: var(--sdmx-space-xs);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  background: var(--sdmx-color-bg-surface);
  padding: var(--sdmx-space-xs);
  max-height: 32vh;
  overflow: hidden;
}

.command-line-bar__history-head {
  display: flex;
  gap: var(--sdmx-space-xs);
}

.command-line-bar__history-query {
  flex: 1 1 auto;
  background: var(--sdmx-color-bg-inset);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  padding: 4px var(--sdmx-space-xs);
  color: var(--sdmx-color-text);
  font-size: var(--sdmx-font-size-caption);
}

.command-line-bar__history-list {
  margin-top: var(--sdmx-space-xs);
  max-height: 180px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.command-line-bar__history-item {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-xs);
}

.command-line-bar__history-run {
  flex: 1 1 auto;
  text-align: left;
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  background: var(--sdmx-color-bg-inset);
  color: var(--sdmx-color-text);
  font-size: var(--sdmx-font-size-caption);
  padding: 4px var(--sdmx-space-xs);
  cursor: pointer;
}

.command-line-bar__message {
  margin: var(--sdmx-space-xs) 0 0;
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  font-size: var(--sdmx-font-size-caption);
  white-space: pre-wrap;
  border-radius: var(--sdmx-radius-sm);
  max-height: 24vh;
  overflow: auto;
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
