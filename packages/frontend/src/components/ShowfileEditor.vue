<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--
  Purpose: Comprehensive showfile editor for creating and modifying lighting setups
-->
<script setup lang="ts">
import { useShowStore } from 'src/stores/show';
import { useUIStore } from 'src/stores/ui';
import {
  getAllFixtures,
  getFixtureDefinition as lookupFixture,
  pluginRegistryVersion,
} from 'src/fixture-library/registry';
import type { ShowDocument } from '@softdmx/engine';
import { createEmptyShow } from '@softdmx/engine';
import { ref, computed, watch, onMounted } from 'vue';
import type { ShowfileFixture, FixtureDefinition } from '@softdmx/engine';
import { createConfirm, createAlert } from 'src/lib/CommonDialogs';
import * as YAML from 'yaml';
import FixtureBrowser from './FixtureBrowser.vue';
import {
  GROUP_COLOR_PALETTE,
  defaultGroupColorForIndex,
  groupColorStyle,
  normalizeGroupColor,
} from '@softdmx/engine';

const showStore = useShowStore();
const ui = useUIStore();
const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });
const emit = defineEmits<{ close: [] }>();

type ShowfileLinkedGroup = {
  name: string;
  names: string[];
  color?: string;
};

type EditorShowfile = {
  name: string;
  fixtures: ShowfileFixture[];
  linkedGroups: ShowfileLinkedGroup[];
};

function docToEditor(doc: ShowDocument): EditorShowfile {
  return {
    name: doc.meta.name,
    fixtures: doc.fixtures,
    linkedGroups: doc.groups.map((group, index) => ({
      name: group.name,
      names: group.fixtures,
      color: normalizeGroupColor(group.color) ?? defaultGroupColorForIndex(index),
    })),
  };
}

function editorToDoc(editor: EditorShowfile): ShowDocument {
  return {
    ...showStore.document,
    meta: { ...showStore.document.meta, name: editor.name, modified: new Date().toISOString() },
    fixtures: editor.fixtures,
    groups: editor.linkedGroups.map((group, index) => ({
      name: group.name,
      fixtures: group.names,
      color: normalizeGroupColor(group.color) ?? defaultGroupColorForIndex(index),
    })),
  };
}
const editingShowfile = ref<EditorShowfile>({ name: '', fixtures: [], linkedGroups: [] });

const isEditing = ref(false);
const hasUnsavedChanges = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const triggerFilePicker = () => {
  fileInput.value?.click();
};

const onFilePicked = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  try {
    await showStore.loadShowFromFile(file);
    editingShowfile.value = docToEditor(showStore.document);
    isEditing.value = true;
    hasUnsavedChanges.value = false;
  } catch (error) {
    await createAlert({
      title: 'Error',
      message: `Failed to load showfile: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  } finally {
    target.value = '';
  }
};

const loadFromFileInEditor = async () => {
  if (hasUnsavedChanges.value) {
    const confirmed = await createConfirm({
      title: 'Discard Changes?',
      message: 'You have unsaved changes in the editor. Loading a file will overwrite your changes. Do you want to proceed?',
    });
    if (confirmed) {
      triggerFilePicker();
    }
  } else {
    triggerFilePicker();
  }
};

// UI state
const selectedTab = ref('basic');
const fixtureSearchText = ref('');
const groupSearchText = ref('');

// Fixture management
const availableFixtureTypes = computed(() => {
  void pluginRegistryVersion.value;
  return getAllFixtures();
});
const selectedFixtureType = ref<string>('');
const newFixtureName = ref('');
const newFixtureStartingChannel = ref<number | undefined>(undefined);
const showAddFixtureDialog = ref(false);
const showEditFixtureDialog = ref(false);
const editingFixtureIndex = ref<number | null>(null);

// Group management
const newGroupName = ref('');
const newGroupFixtures = ref<string[]>([]);
const newGroupColor = ref(defaultGroupColorForIndex(0));
const showAddGroupDialog = ref(false);
const editingGroupIndex = ref<number | null>(null);

// Initialize with current showfile or create new
const initializeEditor = (createNew = false) => {
  if (createNew) {
    editingShowfile.value = {
      name: 'New Showfile',
      fixtures: [],
      linkedGroups: []
    };
  } else {
    editingShowfile.value = docToEditor(showStore.document);
  }
  isEditing.value = true;
  hasUnsavedChanges.value = false;
};

const createNewShowfile = () => {
  initializeEditor(true);
};

const editCurrentShowfile = () => {
  initializeEditor(false);
};

function openForEdit() {
  editCurrentShowfile();
}

function leaveEditor() {
  if (props.embedded) {
    ui.setMode('live');
    return;
  }
  emit('close');
}

defineExpose({ openForEdit });

onMounted(() => {
  if (props.embedded) {
    openForEdit();
  }
});

// Track changes
watch(editingShowfile, () => {
  hasUnsavedChanges.value = true;
}, { deep: true });

// Fixture operations
const addFixture = () => {
  if (!newFixtureName.value.trim() || !selectedFixtureType.value) {
    return;
  }

  const fixture: ShowfileFixture = {
    name: newFixtureName.value.trim(),
    fixtureId: selectedFixtureType.value,
    ...(newFixtureStartingChannel.value !== undefined && { startingChannel: newFixtureStartingChannel.value })
  };

  editingShowfile.value.fixtures.push(fixture);
  newFixtureName.value = '';
  selectedFixtureType.value = '';
  newFixtureStartingChannel.value = undefined;
  showAddFixtureDialog.value = false;
};

const removeFixture = async (index: number) => {
  const fixture = editingShowfile.value.fixtures[index];
  if (!fixture) return;

  const confirmed = await createConfirm({
    title: 'Remove Fixture',
    message: `Are you sure you want to remove "${fixture.name}"? This will also remove it from any linked groups.`,
  });
  if (confirmed) {
    // Remove fixture
    editingShowfile.value.fixtures.splice(index, 1);

    // Remove from linked groups
    editingShowfile.value.linkedGroups?.forEach(group => {
      group.names = group.names.filter(name => name !== fixture.name);
    });

    // Remove empty groups
    if (editingShowfile.value.linkedGroups) {
      editingShowfile.value.linkedGroups = editingShowfile.value.linkedGroups.filter(
        group => group.names.length > 0
      );
    }
  }
};

const duplicateFixture = (index: number) => {
  const originalFixture = editingShowfile.value.fixtures[index];
  if (!originalFixture) return;

  // When duplicating, don't copy the starting channel as it would cause conflicts
  // Let the new fixture follow the normal channel progression
  const duplicatedFixture: ShowfileFixture = {
    name: `${originalFixture.name} Copy`,
    fixtureId: originalFixture.fixtureId
  };

  editingShowfile.value.fixtures.splice(index + 1, 0, duplicatedFixture);
};

const editFixture = (index: number) => {
  const fixture = editingShowfile.value.fixtures[index];
  if (!fixture) return;

  newFixtureName.value = fixture.name;
  selectedFixtureType.value = fixture.fixtureId;
  newFixtureStartingChannel.value = fixture.startingChannel;
  editingFixtureIndex.value = index;
  showEditFixtureDialog.value = true;
};

const updateFixture = () => {
  if (!newFixtureName.value.trim() || !selectedFixtureType.value || editingFixtureIndex.value === null) {
    return;
  }

  const fixture: ShowfileFixture = {
    name: newFixtureName.value.trim(),
    fixtureId: selectedFixtureType.value,
    ...(newFixtureStartingChannel.value !== undefined && { startingChannel: newFixtureStartingChannel.value })
  };

  editingShowfile.value.fixtures[editingFixtureIndex.value] = fixture;

  newFixtureName.value = '';
  selectedFixtureType.value = '';
  newFixtureStartingChannel.value = undefined;
  editingFixtureIndex.value = null;
  showEditFixtureDialog.value = false;
};// Group operations
const resetGroupDialog = () => {
  newGroupName.value = '';
  newGroupFixtures.value = [];
  newGroupColor.value = defaultGroupColorForIndex(editingShowfile.value.linkedGroups?.length ?? 0);
  editingGroupIndex.value = null;
};

const openAddGroupDialog = () => {
  resetGroupDialog();
  showAddGroupDialog.value = true;
};

const addGroup = () => {
  if (!newGroupName.value.trim() || newGroupFixtures.value.length === 0) {
    return;
  }

  const group: ShowfileLinkedGroup = {
    name: newGroupName.value.trim(),
    names: [...newGroupFixtures.value],
    color: normalizeGroupColor(newGroupColor.value) ?? defaultGroupColorForIndex(editingGroupIndex.value ?? editingShowfile.value.linkedGroups?.length ?? 0),
  };

  if (!editingShowfile.value.linkedGroups) {
    editingShowfile.value.linkedGroups = [];
  }

  if (editingGroupIndex.value !== null) {
    editingShowfile.value.linkedGroups[editingGroupIndex.value] = group;
    editingGroupIndex.value = null;
  } else {
    editingShowfile.value.linkedGroups.push(group);
  }

  resetGroupDialog();
  showAddGroupDialog.value = false;
};

const editGroup = (index: number) => {
  const group = editingShowfile.value.linkedGroups?.[index];
  if (!group) return;

  newGroupName.value = group.name;
  newGroupFixtures.value = [...group.names];
  newGroupColor.value = normalizeGroupColor(group.color) ?? defaultGroupColorForIndex(index);
  editingGroupIndex.value = index;
  showAddGroupDialog.value = true;
};

const removeGroup = async (index: number) => {
  const group = editingShowfile.value.linkedGroups?.[index];
  if (!group) return;

  const confirmed = await createConfirm({
    title: 'Remove Group',
    message: `Are you sure you want to remove the group "${group.name}"?`,
  });
  if (confirmed) {
    editingShowfile.value.linkedGroups?.splice(index, 1);
  }
};

// Validation
const isValidShowfile = computed(() => {
  return editingShowfile.value.name.trim().length > 0 &&
         editingShowfile.value.fixtures.length > 0;
});

const validationErrors = computed(() => {
  const errors: string[] = [];

  if (!editingShowfile.value.name.trim()) {
    errors.push('Showfile name is required');
  }

  if (editingShowfile.value.fixtures.length === 0) {
    errors.push('At least one fixture is required');
  }

  // Check for duplicate fixture names
  const fixtureNames = editingShowfile.value.fixtures.map(f => f.name);
  const duplicateNames = fixtureNames.filter((name, index) => fixtureNames.indexOf(name) !== index);
  if (duplicateNames.length > 0) {
    errors.push(`Duplicate fixture names: ${[...new Set(duplicateNames)].join(', ')}`);
  }

  // Check for duplicate group names
  if (editingShowfile.value.linkedGroups) {
    const groupNames = editingShowfile.value.linkedGroups.map(g => g.name);
    const duplicateGroupNames = groupNames.filter((name, index) => groupNames.indexOf(name) !== index);
    if (duplicateGroupNames.length > 0) {
      errors.push(`Duplicate group names: ${[...new Set(duplicateGroupNames)].join(', ')}`);
    }
  }

  return errors;
});

// Save operations
const saveShowfile = async () => {
  if (!isValidShowfile.value) {
    await createAlert({
      title: 'Validation Error',
      message: validationErrors.value.join('\n'),
    });
    return;
  }

  try {
    showStore.loadShow(editorToDoc(editingShowfile.value));
    hasUnsavedChanges.value = false;
    isEditing.value = false;
    ui.setMode('live');
    leaveEditor();
  } catch (error) {
    await createAlert({
      title: 'Error',
      message: `Failed to load showfile: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
};

const saveAndExport = async () => {
  if (!isValidShowfile.value) {
    await createAlert({
      title: 'Validation Error',
      message: validationErrors.value.join('\n'),
    });
    return;
  }

  try {
    showStore.loadShow(editorToDoc(editingShowfile.value));
    showStore.downloadShow();
    hasUnsavedChanges.value = false;
    isEditing.value = false;
    ui.setMode('live');
    leaveEditor();
  } catch (error) {
    await createAlert({
      title: 'Error',
      message: `Failed to save and export showfile: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
};

const discardChanges = async () => {
  if (hasUnsavedChanges.value) {
    const confirmed = await createConfirm({
      title: 'Discard Changes',
      message: 'Are you sure you want to discard all unsaved changes?',
    });
    if (confirmed) {
      isEditing.value = false;
      hasUnsavedChanges.value = false;
      leaveEditor();
    }
  } else {
    isEditing.value = false;
    leaveEditor();
  }
};

// Computed helpers
const filteredFixtures = computed(() => {
  if (!fixtureSearchText.value) return editingShowfile.value.fixtures;
  return editingShowfile.value.fixtures.filter(fixture =>
    fixture.name.toLowerCase().includes(fixtureSearchText.value.toLowerCase()) ||
    fixture.fixtureId.toLowerCase().includes(fixtureSearchText.value.toLowerCase())
  );
});

const filteredGroups = computed(() => {
  if (!editingShowfile.value.linkedGroups) return [];
  if (!groupSearchText.value) return editingShowfile.value.linkedGroups;
  return editingShowfile.value.linkedGroups.filter(group =>
    group.name.toLowerCase().includes(groupSearchText.value.toLowerCase())
  );
});

const availableFixturesForGroup = computed(() => {
  return editingShowfile.value.fixtures.map(f => ({
    label: f.name,
    value: f.name
  }));
});

const getFixtureDefinition = (fixtureId: string): FixtureDefinition | undefined => {
  return lookupFixture(fixtureId);
};

// Helper function to calculate channel ranges for fixtures
const getFixtureChannelInfo = (fixture: ShowfileFixture, fixtureIndex: number) => {
  const fixtureDef = getFixtureDefinition(fixture.fixtureId);
  if (!fixtureDef) return { startChannel: 1, endChannel: 1, channelCount: 0 };

  const channelCount = fixtureDef.channels.length;

  // Calculate starting channel
  let startChannel = 1;

  if (fixture.startingChannel !== undefined) {
    // Use explicit starting channel
    startChannel = fixture.startingChannel;
  } else {
    // Calculate based on previous fixtures
    for (let i = 0; i < fixtureIndex; i++) {
      const prevFixture = editingShowfile.value.fixtures[i];
      if (!prevFixture) continue;

      const prevFixtureDef = getFixtureDefinition(prevFixture.fixtureId);
      if (prevFixtureDef) {
        if (prevFixture.startingChannel !== undefined) {
          startChannel = Math.max(startChannel, prevFixture.startingChannel + prevFixtureDef.channels.length);
        } else {
          startChannel += prevFixtureDef.channels.length;
        }
      }
    }
  }

  const endChannel = startChannel + channelCount - 1;

  return { startChannel, endChannel, channelCount };
};
</script>

<template>
  <div class="showfile-editor">
    <input
      type="file"
      ref="fileInput"
      accept=".yml,.yaml"
      style="display: none"
      @change="onFilePicked"
    />

    <!-- Main Editor View -->
    <div v-if="isEditing" class="editor-container">
      <!-- Header -->
      <div class="editor-header">
        <div class="header-info">
          <h5 class="editor-title">
            Showfile Editor
            <XChip
              v-if="hasUnsavedChanges"
              color="warning"
              dense
              size="sm"
              label="Unsaved"
            />
          </h5>
          <div class="showfile-info">
            <div class="showfile-name-input">
              <XInput
                v-model="editingShowfile.name"
                label="Showfile Name"
                placeholder="Showfile Name"
              />
            </div>
            <div class="stats">
              {{ editingShowfile.fixtures.length }} fixtures,
              {{ editingShowfile.linkedGroups?.length || 0 }} groups
            </div>
          </div>
        </div>

        <div class="header-actions">
          <XButton
            @click="saveShowfile"
            color="primary"
            icon="device-floppy"
            label="Save & Load"
            :disable="!isValidShowfile"
          />
          <XButton
            @click="loadFromFileInEditor"
            color="default"
            icon="file-upload"
            label="Load from File"
          />
          <XButton
            @click="saveAndExport"
            color="default"
            icon="download"
            label="Save & Export"
            :disable="!isValidShowfile"
          />
          <XButton
            @click="discardChanges"
            color="danger"
            icon="x"
            label="Cancel"
          />
        </div>
      </div>

      <!-- Validation Errors -->
      <div v-if="validationErrors.length > 0" class="validation-errors">
        <XWell class="validation-errors__well">
          <XIcon name="alert-triangle" class="validation-errors__icon" />
          <div class="error-list">
            <div v-for="error in validationErrors" :key="error">{{ error }}</div>
          </div>
        </XWell>
      </div>

      <!-- Tabs -->
      <XTabs v-model="selectedTab" class="editor-tabs">
        <XTab name="basic" icon="info-circle" label="Basic Info" />
        <XTab name="fixtures" icon="lightbulb" label="Fixtures" />
        <XTab name="users" icon="hierarchy" label="Groups" />
        <XTab name="browser" icon="compass" label="Browse Fixtures" />
        <XTab name="preview" icon="preview" label="Preview" />
      </XTabs>

      <!-- Tab Panels -->
      <div class="editor-panels">
        <!-- Basic Info Tab -->
        <div v-show="selectedTab === 'basic'" class="basic-panel">
          <div class="basic-info">
            <div class="column name-input">
              <div class="field-label">Showfile Name</div>
              <XInput
                v-model="editingShowfile.name"
                placeholder="Choose a descriptive name for your lighting setup"
              />
            </div>

            <div class="showfile-stats">
              <XCard class="stat-card">
                <div class="stat-card__body">
                  <div class="stat-number">{{ editingShowfile.fixtures.length }}</div>
                  <div class="stat-label">Fixtures</div>
                </div>
              </XCard>

              <XCard class="stat-card">
                <div class="stat-card__body">
                  <div class="stat-number">{{ editingShowfile.linkedGroups?.length || 0 }}</div>
                  <div class="stat-label">Groups</div>
                </div>
              </XCard>

              <XCard class="stat-card">
                <div class="stat-card__body">
                  <div class="stat-number">{{ availableFixtureTypes.length }}</div>
                  <div class="stat-label">Available Types</div>
                </div>
              </XCard>
            </div>
          </div>
        </div>

        <!-- Fixtures Tab -->
        <div v-show="selectedTab === 'fixtures'" class="fixtures-panel">
          <div class="panel-header">
            <XInput
              v-model="fixtureSearchText"
              placeholder="Search fixtures..."
              class="search-input"
            >
              <template #prepend>
                <XIcon name="search" class="search-icon" />
              </template>
            </XInput>

            <XButton
              @click="showAddFixtureDialog = true"
              color="primary"
              icon="plus"
              label="Add Fixture"
            />
          </div>

          <div class="fixtures-list">
            <XCard
              v-for="(fixture, index) in filteredFixtures"
              :key="index"
              class="fixture-card"
            >
              <div class="fixture-card__body">
                <div class="fixture-header">
                  <div class="fixture-info">
                    <div class="fixture-name">{{ fixture.name }}</div>
                    <div class="fixture-type">{{ fixture.fixtureId }}</div>
                    <div class="fixture-details">
                      {{ (() => {
                        const info = getFixtureChannelInfo(fixture, index);
                        return `Ch ${info.startChannel}-${info.endChannel} (${info.channelCount} channels)`;
                      })() }}
                    </div>
                    <div v-if="fixture.startingChannel !== undefined" class="fixture-starting-channel">
                      Explicit start: {{ fixture.startingChannel }}
                    </div>
                  </div>

                  <div class="fixture-actions">
                    <XButton
                      flat
                      size="sm"
                      icon="pencil"
                      v-info="'program.showfile.editSection'"
                      @click="editFixture(index)"
                    />
                    <XButton
                      flat
                      size="sm"
                      icon="copy"
                      v-info="'program.showfile.duplicateSection'"
                      @click="duplicateFixture(index)"
                    />
                    <XButton
                      flat
                      size="sm"
                      icon="trash"
                      color="danger"
                      v-info="'program.showfile.removeSection'"
                      @click="removeFixture(index)"
                    />
                  </div>
                </div>
              </div>
            </XCard>

            <div v-if="filteredFixtures.length === 0" class="empty-state">
              <XIcon name="lightbulb" size="4rem" class="empty-state__icon" />
              <div class="empty-message">No fixtures found</div>
              <div class="empty-hint">Add fixtures to get started</div>
            </div>
          </div>
        </div>

        <!-- Groups Tab -->
        <div v-show="selectedTab === 'users'" class="groups-panel">
          <div class="panel-header">
            <XInput
              v-model="groupSearchText"
              placeholder="Search groups..."
              class="search-input"
            >
              <template #prepend>
                <XIcon name="search" class="search-icon" />
              </template>
            </XInput>

            <XButton
              @click="openAddGroupDialog"
              color="primary"
              icon="plus"
              label="Add Group"
              :disable="editingShowfile.fixtures.length === 0"
            />
          </div>

          <div class="groups-list">
            <XCard
              v-for="(group, index) in filteredGroups"
              :key="index"
              class="group-card"
              :class="{ 'has-group-color': !!group.color }"
              :style="groupColorStyle(group.color)"
            >
              <div class="group-card__body">
                <div class="group-header">
                  <div class="group-info">
                    <div class="group-name-row">
                      <span
                        v-if="group.color"
                        class="group-color-dot"
                        :style="{ background: group.color }"
                      />
                      <div class="group-name">{{ group.name }}</div>
                    </div>
                    <div class="group-fixtures">{{ group.names.length }} fixtures</div>
                  </div>

                  <div class="group-actions">
                    <XButton
                      flat
                      size="sm"
                      icon="pencil"
                      v-info="'program.showfile.editSection'"
                      @click="editGroup(index)"
                    />
                    <XButton
                      flat
                      size="sm"
                      icon="trash"
                      color="danger"
                      v-info="'program.showfile.removeSection'"
                      @click="removeGroup(index)"
                    />
                  </div>
                </div>

                <div class="group-members">
                  <XChip
                    v-for="fixtureName in group.names"
                    :key="fixtureName"
                    :label="fixtureName"
                    size="sm"
                    outline
                    :style="group.color ? { color: group.color, borderColor: group.color } : undefined"
                  />
                </div>
              </div>
            </XCard>

            <div v-if="filteredGroups.length === 0" class="empty-state">
              <XIcon name="hierarchy" size="4rem" class="empty-state__icon" />
              <div class="empty-message">No groups found</div>
              <div class="empty-hint">Create groups to organize your fixtures</div>
            </div>
          </div>
        </div>

        <!-- Preview Tab -->
        <div v-show="selectedTab === 'preview'" class="preview-panel">
          <div class="preview-content">
            <h6>YAML Preview</h6>
            <XCard class="yaml-preview">
              <div class="yaml-preview__body">
                <pre>{{ YAML.stringify(editingShowfile) }}</pre>
              </div>
            </XCard>
          </div>
        </div>

        <!-- Browse Fixtures Tab -->
        <div v-show="selectedTab === 'browser'" class="browser-panel">
          <FixtureBrowser />
        </div>
      </div>
    </div>

    <!-- Start Screen -->
    <div v-else class="start-screen">
      <XCard class="start-card">
        <div class="start-card__body">
          <XIcon name="pencil" size="4rem" class="start-card__icon" />
          <h5>Showfile Editor</h5>
          <p class="start-card__subtitle">Create and modify lighting showfiles</p>

          <div class="start-actions">
            <XButton
              @click="createNewShowfile"
              color="primary"
              icon="plus"
              label="Create New Showfile"
              size="lg"
              class="start-btn"
            />

            <XButton
              @click="editCurrentShowfile"
              color="default"
              icon="pencil"
              label="Edit Current Showfile"
              size="lg"
              class="start-btn"
              :disable="!showStore.document.fixtures.length"
            />

            <XButton
              @click="triggerFilePicker"
              color="default"
              icon="file-upload"
              label="Load Showfile"
              size="lg"
              class="start-btn"
            />

            <XButton
              v-if="showStore.document.fixtures.length"
              @click="showStore.downloadShow()"
              color="default"
              icon="download"
              label="Save & Export Current"
              size="lg"
              class="start-btn"
            />

            <XButton
              @click="leaveEditor"
              color="default"
              icon="arrow-left"
              label="Back to Workspace"
              size="lg"
              class="start-btn"
            />
          </div>

          <div v-if="showStore.document.fixtures.length" class="current-showfile-info">
            <hr class="sdmx-separator" />
            <div class="current-showfile-info__label">Current Showfile</div>
            <div class="current-showfile-info__name">{{ showStore.document.meta.name }}</div>
            <div class="current-showfile-info__meta">
              {{ showStore.document.fixtures.length }} fixtures,
              {{ showStore.document.groups.length }} groups
            </div>
          </div>
        </div>
      </XCard>
    </div>

    <!-- Add Fixture Dialog -->
    <XDialog v-model="showAddFixtureDialog">
      <XDialogHeader title="Add Fixture" />
      <XDialogBody class="showfile-dialog-body">
        <XInput
          v-model="newFixtureName"
          label="Fixture Name"
          placeholder="Fixture Name"
          @keyup.enter="addFixture"
        />
        <XSelect
          v-model="selectedFixtureType"
          label="Fixture Type"
          :options="availableFixtureTypes.map(f => ({ label: f.name, value: f.id }))"
        />
        <div>
          <XInput
            v-model.number="newFixtureStartingChannel"
            label="Starting Channel (optional)"
            placeholder="Starting Channel (optional)"
            type="number"
          />
          <div class="field-hint">If not specified, will continue from previous fixture</div>
        </div>
      </XDialogBody>
      <XDialogFooter>
        <XButton flat label="Cancel" @click="showAddFixtureDialog = false" />
        <XButton
          color="primary"
          label="Add"
          @click="addFixture"
          :disable="!newFixtureName.trim() || !selectedFixtureType"
        />
      </XDialogFooter>
    </XDialog>

    <!-- Edit Fixture Dialog -->
    <XDialog v-model="showEditFixtureDialog">
      <XDialogHeader title="Edit Fixture" />
      <XDialogBody class="showfile-dialog-body">
        <XInput
          v-model="newFixtureName"
          label="Fixture Name"
          placeholder="Fixture Name"
          @keyup.enter="updateFixture"
        />
        <XSelect
          v-model="selectedFixtureType"
          label="Fixture Type"
          :options="availableFixtureTypes.map(f => ({ label: f.name, value: f.id }))"
        />
        <div>
          <XInput
            v-model.number="newFixtureStartingChannel"
            label="Starting Channel (optional)"
            placeholder="Starting Channel (optional)"
            type="number"
          />
          <div class="field-hint">If not specified, will continue from previous fixture</div>
        </div>
      </XDialogBody>
      <XDialogFooter>
        <XButton flat label="Cancel" @click="showEditFixtureDialog = false" />
        <XButton
          color="primary"
          label="Update"
          @click="updateFixture"
          :disable="!newFixtureName.trim() || !selectedFixtureType"
        />
      </XDialogFooter>
    </XDialog>

    <!-- Add/Edit Group Dialog -->
    <XDialog v-model="showAddGroupDialog">
      <XDialogHeader :title="editingGroupIndex !== null ? 'Edit Group' : 'Add Group'" />
      <XDialogBody class="showfile-dialog-body">
        <XInput
          v-model="newGroupName"
          label="Group Name"
          placeholder="Group Name"
          @keyup.enter="addGroup"
        />
        <div>
          <div class="field-label">Select Fixtures</div>
          <XDropdown :label="newGroupFixtures.length > 0 ? `${newGroupFixtures.length} selected` : 'Select fixtures'">
            <div class="fixture-picker" @click.stop>
              <XCheckbox
                v-for="opt in availableFixturesForGroup"
                :key="opt.value"
                :label="opt.label"
                :model-value="newGroupFixtures.includes(opt.value)"
                @update:model-value="(checked) => {
                  const current = [...newGroupFixtures];
                  if (checked) {
                    if (!current.includes(opt.value)) current.push(opt.value);
                  } else {
                    const idx = current.indexOf(opt.value);
                    if (idx > -1) current.splice(idx, 1);
                  }
                  newGroupFixtures = current;
                }"
              />
            </div>
          </XDropdown>
        </div>

        <div class="group-color-picker">
          <div class="field-label">Group Color</div>
          <div class="color-swatch-row">
            <button
              v-for="color in GROUP_COLOR_PALETTE"
              :key="color"
              type="button"
              class="color-swatch"
              :class="{ active: newGroupColor === color }"
              :style="{ background: color }"
              :aria-label="`Use color ${color}`"
              @click="newGroupColor = color"
            />
          </div>
          <XInput
            v-model="newGroupColor"
            label="Color (hex)"
            placeholder="Hex Color"
          >
            <template #prepend>
              <span
                class="group-color-dot"
                :style="{ background: newGroupColor }"
              />
            </template>
          </XInput>
        </div>
      </XDialogBody>
      <XDialogFooter>
        <XButton flat label="Cancel" @click="resetGroupDialog(); showAddGroupDialog = false" />
        <XButton
          color="primary"
          :label="editingGroupIndex !== null ? 'Update' : 'Add'"
          @click="addGroup"
          :disable="!newGroupName.trim() || newGroupFixtures.length === 0"
        />
      </XDialogFooter>
    </XDialog>
  </div>
</template>

<style scoped lang="scss">
.showfile-editor {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.editor-container {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--sdmx-color-border);
  background: var(--sdmx-color-border-faint);

  .header-info {
    display: flex;
    align-items: center;
    gap: 16px;

    .editor-title {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .showfile-info {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .showfile-name-input {
        min-width: 200px;
      }

      .stats {
        font-size: 12px;
        color: var(--sdmx-color-text-muted);
      }
    }
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }
}

.validation-errors {
  margin: 16px;

  &__well {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: var(--sdmx-color-negative, #ff3b30);
  }

  &__icon {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .error-list {
    line-height: 1.5;
  }
}

.editor-tabs {
  background: var(--sdmx-color-border-faint);
}

.editor-panels {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.field-label {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
  margin-bottom: 6px;
}

.field-hint {
  font-size: 11px;
  color: var(--sdmx-color-text-muted);
  margin-top: 4px;
}

.search-icon {
  margin-right: 4px;
}

.stat-card__body,
.fixture-card__body,
.group-card__body,
.yaml-preview__body {
  padding: 16px;
}

.empty-state__icon {
  color: var(--sdmx-color-text-muted);
}

.showfile-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 360px;
}

.fixture-picker {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
  min-width: 160px;
  padding: 8px;
}

.basic-panel {
  padding: 24px;

  .name-input {
    max-width: 400px;
    margin-bottom: 32px;
  }

  .showfile-stats {
    display: flex;
    gap: 16px;

    .stat-card {
      background: var(--sdmx-color-border-subtle);
      text-align: center;
      min-width: 100px;

      .stat-number {
        font-size: 2rem;
        font-weight: 600;
        color: var(--sdmx-color-primary);
      }

      .stat-label {
        font-size: 12px;
        color: var(--sdmx-color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }
  }
}

.fixtures-panel,
.groups-panel {
  display: flex;
  flex-direction: column;
  height: 100%;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    gap: 16px;
    border-bottom: 1px solid var(--sdmx-color-border);

    .search-input {
      flex: 1;
      max-width: 300px;
    }
  }

  .fixtures-list,
  .groups-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .fixture-card,
  .group-card {
    background: var(--sdmx-color-border-subtle);

    &.has-group-color {
      border-left: 4px solid var(--fixture-group-color);
    }

    .fixture-header,
    .group-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;

      .fixture-info,
      .group-info {
        .fixture-name,
        .group-name {
          font-weight: 600;
          font-size: 16px;
        }

        .fixture-type,
        .group-fixtures {
          color: var(--sdmx-color-primary);
          font-size: 12px;
          margin: 2px 0;
        }

        .fixture-details {
          color: var(--sdmx-color-text-muted);
          font-size: 11px;
        }

        .fixture-starting-channel {
          color: var(--sdmx-color-primary);
          font-size: 10px;
          font-weight: 600;
          margin-top: 2px;
        }
      }

      .fixture-actions,
      .group-actions {
        display: flex;
        gap: 4px;
      }
    }

    .group-members {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--sdmx-color-text-faint);

    .empty-message {
      font-size: 18px;
      margin: 16px 0 8px;
    }

    .empty-hint {
      font-size: 14px;
      color: var(--sdmx-color-text-faint);
    }
  }
}

.preview-panel {
  padding: 16px;

  .yaml-preview {
    background: var(--sdmx-color-shadow);
    margin-top: 16px;

    pre {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  }
}

.browser-panel {
  padding: 0;
  height: 100%;

  :deep(.fixture-browser) {
    height: 100%;
  }
}

.start-screen {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;

  .start-card {
    max-width: 500px;
    background: var(--sdmx-color-border-subtle);

    &__body {
      padding: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    &__icon {
      color: var(--sdmx-color-primary);
      margin-bottom: 8px;
    }

    &__subtitle {
      color: var(--sdmx-color-text-muted);
      margin: 0 0 8px;
    }

    h5 {
      margin: 16px 0 8px;
    }

    .start-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 24px 0;
      width: 100%;

      .start-btn {
        min-height: 48px;
      }
    }

    .current-showfile-info {
      text-align: center;
      width: 100%;

      .sdmx-separator {
        margin: 16px 0;
      }

      &__label {
        font-size: 12px;
        color: var(--sdmx-color-text-muted);
      }

      &__name {
        font-weight: 700;
      }

      &__meta {
        font-size: 12px;
        color: var(--sdmx-color-text-muted);
      }
    }
  }
}

.group-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--sdmx-color-text) 20%, transparent);
}

.color-swatch-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;

  &.active {
    border-color: var(--sdmx-color-text);
    box-shadow: 0 0 0 1px var(--sdmx-color-surface);
  }
}
</style>
