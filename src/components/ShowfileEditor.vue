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
import { useDMXStore } from 'src/stores/dmx';
import { ref, computed, watch } from 'vue';
import type { Showfile, ShowfileFixture, ShowfileLinkedGroup, FixtureDefinition } from 'src/types';
import { Dialog } from 'quasar';
import * as YAML from 'yaml';
import FixtureBrowser from './FixtureBrowser.vue';

const dmx = useDMXStore();

// Editor state
const editingShowfile = ref<Showfile>({
  name: '',
  fixtures: [],
  linkedGroups: []
});
const isEditing = ref(false);
const hasUnsavedChanges = ref(false);

// UI state
const selectedTab = ref('basic');
const fixtureSearchText = ref('');
const groupSearchText = ref('');

// Fixture management
const availableFixtureTypes = computed(() => dmx.Fixtures);
const selectedFixtureType = ref<string>('');
const newFixtureName = ref('');
const newFixtureStartingChannel = ref<number | undefined>(undefined);
const showAddFixtureDialog = ref(false);
const showEditFixtureDialog = ref(false);
const editingFixtureIndex = ref<number | null>(null);

// Group management
const newGroupName = ref('');
const newGroupFixtures = ref<string[]>([]);
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
  } else if (dmx.showfile) {
    editingShowfile.value = JSON.parse(JSON.stringify(dmx.showfile));
  } else {
    editingShowfile.value = {
      name: 'New Showfile',
      fixtures: [],
      linkedGroups: []
    };
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

const removeFixture = (index: number) => {
  const fixture = editingShowfile.value.fixtures[index];
  if (!fixture) return;

  Dialog.create({
    title: 'Remove Fixture',
    message: `Are you sure you want to remove "${fixture.name}"? This will also remove it from any linked groups.`,
    cancel: true,
    persistent: true
  }).onOk(() => {
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
  });
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
const addGroup = () => {
  if (!newGroupName.value.trim() || newGroupFixtures.value.length === 0) {
    return;
  }

  const group: ShowfileLinkedGroup = {
    name: newGroupName.value.trim(),
    names: [...newGroupFixtures.value]
  };

  if (!editingShowfile.value.linkedGroups) {
    editingShowfile.value.linkedGroups = [];
  }

  if (editingGroupIndex.value !== null) {
    // Editing existing group
    editingShowfile.value.linkedGroups[editingGroupIndex.value] = group;
    editingGroupIndex.value = null;
  } else {
    // Adding new group
    editingShowfile.value.linkedGroups.push(group);
  }

  newGroupName.value = '';
  newGroupFixtures.value = [];
  showAddGroupDialog.value = false;
};

const editGroup = (index: number) => {
  const group = editingShowfile.value.linkedGroups?.[index];
  if (!group) return;

  newGroupName.value = group.name;
  newGroupFixtures.value = [...group.names];
  editingGroupIndex.value = index;
  showAddGroupDialog.value = true;
};

const removeGroup = (index: number) => {
  const group = editingShowfile.value.linkedGroups?.[index];
  if (!group) return;

  Dialog.create({
    title: 'Remove Group',
    message: `Are you sure you want to remove the group "${group.name}"?`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    editingShowfile.value.linkedGroups?.splice(index, 1);
  });
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
const saveShowfile = () => {
  if (!isValidShowfile.value) {
    Dialog.create({
      title: 'Validation Error',
      message: validationErrors.value.join('\n'),
    });
    return;
  }

  try {
    dmx.loadShowfile(editingShowfile.value);
    hasUnsavedChanges.value = false;
    Dialog.create({
      title: 'Success',
      message: `Showfile "${editingShowfile.value.name}" has been loaded successfully!`,
    });
  } catch (error) {
    Dialog.create({
      title: 'Error',
      message: `Failed to load showfile: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
};

const saveAndExport = () => {
  if (!isValidShowfile.value) {
    Dialog.create({
      title: 'Validation Error',
      message: validationErrors.value.join('\n'),
    });
    return;
  }

  try {
    dmx.loadShowfile(editingShowfile.value);
    dmx.downloadShowfileAsYAML();
    hasUnsavedChanges.value = false;
    Dialog.create({
      title: 'Success',
      message: `Showfile "${editingShowfile.value.name}" has been saved and exported!`,
    });
  } catch (error) {
    Dialog.create({
      title: 'Error',
      message: `Failed to save and export showfile: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
};

const discardChanges = () => {
  Dialog.create({
    title: 'Discard Changes',
    message: 'Are you sure you want to discard all unsaved changes?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    isEditing.value = false;
    hasUnsavedChanges.value = false;
  });
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
  return dmx.Fixtures.find(f => f.id === fixtureId);
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
    <!-- Main Editor View -->
    <div v-if="isEditing" class="editor-container">
      <!-- Header -->
      <div class="editor-header">
        <div class="header-info">
          <h5 class="editor-title">
            Showfile Editor
            <q-badge v-if="hasUnsavedChanges" color="warning" label="Unsaved" />
          </h5>
          <div class="showfile-info">
            <q-input
              v-model="editingShowfile.name"
              label="Showfile Name"
              dense
              class="showfile-name-input"
            />
            <div class="stats">
              {{ editingShowfile.fixtures.length }} fixtures,
              {{ editingShowfile.linkedGroups?.length || 0 }} groups
            </div>
          </div>
        </div>

        <div class="header-actions">
          <q-btn
            @click="saveShowfile"
            color="primary"
            icon="save"
            label="Load Showfile"
            :disable="!isValidShowfile"
          />
          <q-btn
            @click="saveAndExport"
            color="positive"
            icon="download"
            label="Save & Export"
            :disable="!isValidShowfile"
          />
          <q-btn
            @click="discardChanges"
            color="negative"
            icon="close"
            label="Cancel"
          />
        </div>
      </div>

      <!-- Validation Errors -->
      <div v-if="validationErrors.length > 0" class="validation-errors">
        <q-banner class="text-negative">
          <template v-slot:avatar>
            <q-icon name="warning" />
          </template>
          <div class="error-list">
            <div v-for="error in validationErrors" :key="error">{{ error }}</div>
          </div>
        </q-banner>
      </div>

      <!-- Tabs -->
      <q-tabs v-model="selectedTab" class="editor-tabs">
        <q-tab name="basic" icon="info" label="Basic Info" />
        <q-tab name="fixtures" icon="lightbulb" label="Fixtures" />
        <q-tab name="groups" icon="group_work" label="Groups" />
        <q-tab name="browser" icon="explore" label="Browse Fixtures" />
        <q-tab name="preview" icon="preview" label="Preview" />
      </q-tabs>

      <!-- Tab Panels -->
      <q-tab-panels v-model="selectedTab" class="editor-panels">
        <!-- Basic Info Tab -->
        <q-tab-panel name="basic" class="basic-panel">
          <div class="basic-info">
            <q-input
              v-model="editingShowfile.name"
              label="Showfile Name"
              hint="Choose a descriptive name for your lighting setup"
              class="name-input"
            />

            <div class="showfile-stats">
              <q-card flat class="stat-card">
                <q-card-section>
                  <div class="stat-number">{{ editingShowfile.fixtures.length }}</div>
                  <div class="stat-label">Fixtures</div>
                </q-card-section>
              </q-card>

              <q-card flat class="stat-card">
                <q-card-section>
                  <div class="stat-number">{{ editingShowfile.linkedGroups?.length || 0 }}</div>
                  <div class="stat-label">Groups</div>
                </q-card-section>
              </q-card>

              <q-card flat class="stat-card">
                <q-card-section>
                  <div class="stat-number">{{ availableFixtureTypes.length }}</div>
                  <div class="stat-label">Available Types</div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-tab-panel>

        <!-- Fixtures Tab -->
        <q-tab-panel name="fixtures" class="fixtures-panel">
          <div class="panel-header">
            <q-input
              v-model="fixtureSearchText"
              placeholder="Search fixtures..."
              dense
              class="search-input"
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>

            <q-btn
              @click="showAddFixtureDialog = true"
              color="primary"
              icon="add"
              label="Add Fixture"
            />
          </div>

          <div class="fixtures-list">
            <q-card
              v-for="(fixture, index) in filteredFixtures"
              :key="index"
              class="fixture-card"
            >
              <q-card-section>
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
                    <q-btn
                      @click="editFixture(index)"
                      icon="edit"
                      size="sm"
                      flat
                      round
                    >
                      <q-tooltip>Edit</q-tooltip>
                    </q-btn>
                    <q-btn
                      @click="duplicateFixture(index)"
                      icon="content_copy"
                      size="sm"
                      flat
                      round
                    >
                      <q-tooltip>Duplicate</q-tooltip>
                    </q-btn>
                    <q-btn
                      @click="removeFixture(index)"
                      icon="delete"
                      size="sm"
                      flat
                      round
                      color="negative"
                    >
                      <q-tooltip>Remove</q-tooltip>
                    </q-btn>
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <div v-if="filteredFixtures.length === 0" class="empty-state">
              <q-icon name="lightbulb_outline" size="4rem" class="text-grey-5" />
              <div class="empty-message">No fixtures found</div>
              <div class="empty-hint">Add fixtures to get started</div>
            </div>
          </div>
        </q-tab-panel>

        <!-- Groups Tab -->
        <q-tab-panel name="groups" class="groups-panel">
          <div class="panel-header">
            <q-input
              v-model="groupSearchText"
              placeholder="Search groups..."
              dense
              class="search-input"
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>

            <q-btn
              @click="showAddGroupDialog = true"
              color="primary"
              icon="add"
              label="Add Group"
              :disable="editingShowfile.fixtures.length === 0"
            />
          </div>

          <div class="groups-list">
            <q-card
              v-for="(group, index) in filteredGroups"
              :key="index"
              class="group-card"
            >
              <q-card-section>
                <div class="group-header">
                  <div class="group-info">
                    <div class="group-name">{{ group.name }}</div>
                    <div class="group-fixtures">{{ group.names.length }} fixtures</div>
                  </div>

                  <div class="group-actions">
                    <q-btn
                      @click="editGroup(index)"
                      icon="edit"
                      size="sm"
                      flat
                      round
                    >
                      <q-tooltip>Edit</q-tooltip>
                    </q-btn>
                    <q-btn
                      @click="removeGroup(index)"
                      icon="delete"
                      size="sm"
                      flat
                      round
                      color="negative"
                    >
                      <q-tooltip>Remove</q-tooltip>
                    </q-btn>
                  </div>
                </div>

                <div class="group-members">
                  <q-chip
                    v-for="fixtureName in group.names"
                    :key="fixtureName"
                    :label="fixtureName"
                    size="sm"
                    color="primary"
                    outline
                  />
                </div>
              </q-card-section>
            </q-card>

            <div v-if="filteredGroups.length === 0" class="empty-state">
              <q-icon name="group_work" size="4rem" class="text-grey-5" />
              <div class="empty-message">No groups found</div>
              <div class="empty-hint">Create groups to organize your fixtures</div>
            </div>
          </div>
        </q-tab-panel>

        <!-- Preview Tab -->
        <q-tab-panel name="preview" class="preview-panel">
          <div class="preview-content">
            <h6>YAML Preview</h6>
            <q-card class="yaml-preview">
              <q-card-section>
                <pre>{{ YAML.stringify(editingShowfile) }}</pre>
              </q-card-section>
            </q-card>
          </div>
        </q-tab-panel>

        <!-- Browse Fixtures Tab -->
        <q-tab-panel name="browser" class="browser-panel">
          <FixtureBrowser />
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- Start Screen -->
    <div v-else class="start-screen">
      <q-card flat class="start-card">
        <q-card-section class="text-center">
          <q-icon name="edit" size="4rem" class="text-primary" />
          <h5>Showfile Editor</h5>
          <p class="text-grey-6">Create and modify lighting showfiles</p>

          <div class="start-actions">
            <q-btn
              @click="createNewShowfile"
              color="primary"
              icon="add"
              label="Create New Showfile"
              size="lg"
              class="start-btn"
            />

            <q-btn
              @click="editCurrentShowfile"
              color="secondary"
              icon="edit"
              label="Edit Current Showfile"
              size="lg"
              class="start-btn"
              :disable="!dmx.showfile"
            />
          </div>

          <div v-if="dmx.showfile" class="current-showfile-info">
            <q-separator class="q-my-md" />
            <div class="text-caption text-grey-6">Current Showfile</div>
            <div class="text-body1">{{ dmx.showfile.name }}</div>
            <div class="text-caption">
              {{ dmx.showfile.fixtures.length }} fixtures,
              {{ dmx.showfile.linkedGroups?.length || 0 }} groups
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Add Fixture Dialog -->
    <q-dialog v-model="showAddFixtureDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Add Fixture</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="newFixtureName"
            label="Fixture Name"
            autofocus
            @keyup.enter="addFixture"
          />

          <q-select
            v-model="selectedFixtureType"
            :options="availableFixtureTypes.map(f => ({ label: f.name, value: f.id }))"
            label="Fixture Type"
            emit-value
            map-options
            class="q-mt-md"
          />

          <q-input
            v-model.number="newFixtureStartingChannel"
            label="Starting Channel (optional)"
            type="number"
            min="1"
            max="512"
            hint="If not specified, will continue from previous fixture"
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            label="Add"
            @click="addFixture"
            :disable="!newFixtureName.trim() || !selectedFixtureType"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Edit Fixture Dialog -->
    <q-dialog v-model="showEditFixtureDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Edit Fixture</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="newFixtureName"
            label="Fixture Name"
            autofocus
            @keyup.enter="updateFixture"
          />

          <q-select
            v-model="selectedFixtureType"
            :options="availableFixtureTypes.map(f => ({ label: f.name, value: f.id }))"
            label="Fixture Type"
            emit-value
            map-options
            class="q-mt-md"
          />

          <q-input
            v-model.number="newFixtureStartingChannel"
            label="Starting Channel (optional)"
            type="number"
            min="1"
            max="512"
            hint="If not specified, will continue from previous fixture"
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            label="Update"
            @click="updateFixture"
            :disable="!newFixtureName.trim() || !selectedFixtureType"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Add/Edit Group Dialog -->
    <q-dialog v-model="showAddGroupDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">
            {{ editingGroupIndex !== null ? 'Edit Group' : 'Add Group' }}
          </div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="newGroupName"
            label="Group Name"
            @keyup.enter="addGroup"
          />

          <q-select
            v-model="newGroupFixtures"
            :options="availableFixturesForGroup"
            label="Select Fixtures"
            multiple
            emit-value
            map-options
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            :label="editingGroupIndex !== null ? 'Update' : 'Add'"
            @click="addGroup"
            :disable="!newGroupName.trim() || newGroupFixtures.length === 0"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped lang="scss">
.showfile-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);

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
        color: rgba(255, 255, 255, 0.7);
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

  .error-list {
    line-height: 1.5;
  }
}

.editor-tabs {
  background: rgba(255, 255, 255, 0.05);
}

.editor-panels {
  flex: 1;
  overflow: hidden;
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
      background: rgba(255, 255, 255, 0.08);
      text-align: center;
      min-width: 100px;

      .stat-number {
        font-size: 2rem;
        font-weight: 600;
        color: var(--q-primary);
      }

      .stat-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

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
    background: rgba(255, 255, 255, 0.08);

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
          color: var(--q-primary);
          font-size: 12px;
          margin: 2px 0;
        }

        .fixture-details {
          color: rgba(255, 255, 255, 0.7);
          font-size: 11px;
        }

        .fixture-starting-channel {
          color: var(--q-primary);
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
    color: rgba(255, 255, 255, 0.5);

    .empty-message {
      font-size: 18px;
      margin: 16px 0 8px;
    }

    .empty-hint {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.3);
    }
  }
}

.preview-panel {
  padding: 16px;

  .yaml-preview {
    background: rgba(0, 0, 0, 0.3);
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
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;

  .start-card {
    max-width: 500px;
    background: rgba(255, 255, 255, 0.08);

    h5 {
      margin: 16px 0 8px;
    }

    .start-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 24px 0;

      .start-btn {
        min-height: 48px;
      }
    }

    .current-showfile-info {
      text-align: center;
    }
  }
}
</style>
