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
import { useDMXStore } from 'src/stores/dmx';
import { ref, computed } from 'vue';
import type { FixtureDefinition } from 'src/types';

const dmx = useDMXStore();

const searchText = ref('');
const selectedFixture = ref<FixtureDefinition | null>(null);

const filteredFixtures = computed(() => {
  if (!searchText.value) return dmx.Fixtures;
  return dmx.Fixtures.filter(fixture =>
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
</script>

<template>
  <div class="fixture-browser">
    <div v-if="!selectedFixture" class="fixture-list">
      <div class="list-header">
        <h6>Available Fixtures</h6>
        <q-input
          v-model="searchText"
          placeholder="Search fixtures..."
          dense
          class="search-input"
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>

      <div class="fixtures-grid">
        <q-card
          v-for="fixture in filteredFixtures"
          :key="fixture.id"
          class="fixture-card"
          clickable
          @click="selectFixture(fixture)"
        >
          <q-card-section>
            <div class="fixture-name">{{ fixture.name }}</div>
            <div class="fixture-id">{{ fixture.id }}</div>
            <div class="fixture-channels">{{ fixture.channels.length }} channels</div>

            <div class="channel-preview">
              <q-chip
                v-for="channel in fixture.channels.slice(0, 3)"
                :key="channel.name"
                :label="channel.name"
                size="sm"
                outline
              />
              <span v-if="fixture.channels.length > 3" class="more-channels">
                +{{ fixture.channels.length - 3 }} more
              </span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div v-if="filteredFixtures.length === 0" class="empty-state">
        <q-icon name="search_off" size="3rem" class="text-grey-5" />
        <div class="empty-message">No fixtures found</div>
        <div class="empty-hint">Try adjusting your search terms</div>
      </div>
    </div>

    <div v-else class="fixture-details">
      <div class="details-header">
        <q-btn
          @click="clearSelection"
          icon="arrow_back"
          flat
          round
          size="sm"
        />
        <h6>{{ selectedFixture.name }}</h6>
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
        <h6>Channels</h6>
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

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
      background: rgba(255, 255, 255, 0.08);
      transition: background-color 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.12);
      }

      .fixture-name {
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 4px;
      }

      .fixture-id {
        color: var(--q-primary);
        font-size: 12px;
        margin-bottom: 4px;
      }

      .fixture-channels {
        color: rgba(255, 255, 255, 0.7);
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
          color: rgba(255, 255, 255, 0.5);
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

.fixture-details {
  height: 100%;
  display: flex;
  flex-direction: column;

  .details-header {
    display: flex;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    gap: 12px;

    h6 {
      margin: 0;
    }
  }

  .fixture-info {
    padding: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;

      .label {
        font-weight: 600;
        color: rgba(255, 255, 255, 0.7);
      }

      .value {
        color: var(--q-primary);
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
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);

        .channel-number {
          width: 32px;
          height: 32px;
          background: var(--q-primary);
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
            color: rgba(255, 255, 255, 0.7);
          }
        }
      }
    }
  }
}
</style>
