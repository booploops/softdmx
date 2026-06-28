<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--
  Purpose: Display available fixture definitions with their channels and capabilities
-->
<script setup lang="ts">
import { getAllFixtures, pluginRegistryVersion, registerRuntimeFixtureFromYaml } from 'src/fixture-library/registry';
import { ref, computed } from 'vue';
import type { FixtureDefinition } from '@softdmx/engine';
import { Dialog, Notify } from 'quasar';
import XButton from 'src/components/controls/XButton.vue';
import XInput from 'src/components/controls/XInput.vue';

const searchText = ref('');
const selectedFixture = ref<FixtureDefinition | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const filteredFixtures = computed(() => {
  void pluginRegistryVersion.value;
  const fixtures = getAllFixtures();
  if (!searchText.value) return fixtures;
  return fixtures.filter(fixture =>
    fixture.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
    fixture.id.toLowerCase().includes(searchText.value.toLowerCase()) ||
    fixture.channels.some(channel =>
      channel.name.toLowerCase().includes(searchText.value.toLowerCase())
    )
  );
});

const selectFixture = (fixture: FixtureDefinition) => {
  selectedFixture.value = fixture;
};

const clearSelection = () => {
  selectedFixture.value = null;
};

const openFixtureImportPicker = () => {
  fileInput.value?.click();
};

const onFixtureYamlPicked = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  try {
    const fixture = registerRuntimeFixtureFromYaml(await file.text());
    Notify.create({
      type: 'positive',
      message: `Imported fixture "${fixture.name}" (${fixture.id})`,
    });
  } catch (error) {
    Dialog.create({
      title: 'Fixture Import Failed',
      message: error instanceof Error ? error.message : 'Unknown fixture import error',
    });
  } finally {
    target.value = '';
  }
};
</script>

<template>
  <div class="fixture-browser">
    <input
      ref="fileInput"
      type="file"
      accept=".yaml,.yml"
      style="display: none"
      @change="onFixtureYamlPicked"
    />

    <div v-if="!selectedFixture" class="fixture-list">
      <div class="list-header">
        <div class="header-title-row q-mb-md">
          <h6 class="q-ma-none font-weight-bold">Available Fixtures</h6>
          <XButton
            color="primary"
            icon="upload_file"
            label="Import YAML"
            size="sm"
            @click="openFixtureImportPicker"
          />
        </div>
        <XInput v-model="searchText" placeholder="Search fixtures..." class="search-input">
          <template #prepend><q-icon name="search" /></template>
        </XInput>
      </div>

      <div class="fixtures-grid">
        <div
          v-for="fixture in filteredFixtures"
          :key="fixture.id"
          class="fixture-card"
          @click="selectFixture(fixture)"
        >
          <div class="fixture-card-body">
            <div class="fixture-name">{{ fixture.name }}</div>
            <div class="fixture-id">{{ fixture.id }}</div>
            <div class="fixture-channels">{{ fixture.channels.length }} channels</div>

            <div class="channel-preview">
              <span
                v-for="channel in fixture.channels.slice(0, 3)"
                :key="channel.name"
                class="sdmx-badge sdmx-badge--outline"
              >
                {{ channel.name }}
              </span>
              <span v-if="fixture.channels.length > 3" class="more-channels">
                +{{ fixture.channels.length - 3 }} more
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredFixtures.length === 0" class="empty-state">
        <q-icon name="search_off" size="3rem" class="text-grey-5" />
        <div class="empty-message">No fixtures found</div>
        <div class="empty-hint">Try adjusting your search terms</div>
      </div>
    </div>

    <div v-else class="fixture-details">
      <div class="details-header">
        <XButton
          @click="clearSelection"
          icon="arrow_back"
          flat
          size="sm"
        />
        <h6 class="q-ma-none font-weight-bold">{{ selectedFixture.name }}</h6>
      </div>

      <div class="fixture-info">
        <div class="info-row">
          <span class="label">ID:</span>
          <span class="value">{{ selectedFixture.id }}</span>
        </div>
        <div class="info-row">
          <span class="label">Channels:</span>
          <span class="value">{{ selectedFixture.channels.length }}</span>
        </div>
      </div>

      <div class="channels-section">
        <h6 class="font-weight-bold">Channels</h6>
        <div class="channels-list">
          <div
            v-for="(channel, index) in selectedFixture.channels"
            :key="channel.name"
            class="channel-item"
          >
            <div class="channel-number">{{ index + 1 }}</div>
            <div class="channel-info">
              <div class="channel-name">{{ channel.name }}</div>
              <div class="channel-range">0-255</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.fixture-browser {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.fixture-list {
  height: 100%;
  display: flex;
  flex-direction: column;

  .list-header {
    padding: 16px;
    border-bottom: 1px solid var(--sdmx-color-border);

    .header-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    h6 {
      margin: 0 0 12px 0;
    }

    .search-input {
      max-width: 300px;
    }
  }

  .fixtures-grid {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;

    .fixture-card {
      background: var(--sdmx-color-border-subtle);
      border: 1px solid var(--sdmx-color-border);
      border-radius: 6px;
      cursor: default;
      transition: background-color 0.2s;

      &:hover {
        background: var(--sdmx-color-border);
      }

      .fixture-card-body {
        padding: 16px;
      }

      .fixture-name {
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 4px;
      }

      .fixture-id {
        color: var(--sdmx-color-primary);
        font-size: 12px;
        margin-bottom: 4px;
      }

      .fixture-channels {
        color: var(--sdmx-color-text-muted);
        font-size: 12px;
        margin-bottom: 8px;
      }

      .channel-preview {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;

        .more-channels {
          font-size: 11px;
          color: var(--sdmx-color-text-faint);
        }
      }
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

.fixture-details {
  height: 100%;
  display: flex;
  flex-direction: column;

  .details-header {
    display: flex;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--sdmx-color-border);
    gap: 12px;

    h6 {
      margin: 0;
    }
  }

  .fixture-info {
    padding: 16px;
    border-bottom: 1px solid var(--sdmx-color-border);

    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;

      .label {
        font-weight: 600;
        color: var(--sdmx-color-text-muted);
      }

      .value {
        color: var(--sdmx-color-primary);
      }
    }
  }

  .channels-section {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    h6 {
      margin: 0;
      padding: 16px 16px 0;
    }

    .channels-list {
      flex: 1;
      overflow-y: auto;
      padding: 16px;

      .channel-item {
        display: flex;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid var(--sdmx-color-border-faint);

        .channel-number {
          width: 32px;
          height: 32px;
          background: var(--sdmx-color-primary);
          color: white;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 12px;
          margin-right: 12px;
        }

        .channel-info {
          flex: 1;

          .channel-name {
            font-weight: 600;
            margin-bottom: 2px;
          }

          .channel-range {
            font-size: 12px;
            color: var(--sdmx-color-text-muted);
          }
        }
      }
    }
  }
}
</style>
