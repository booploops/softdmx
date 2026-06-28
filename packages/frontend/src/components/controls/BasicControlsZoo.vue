<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import {
  XButton,
  XSelect,
  XCheckbox,
  XSwitch,
  XSlider,
  XRange,
  XDropdown,
  XListView,
  XListItem,
  XCollapseItem,
  XCard,
  XWell
} from './index';

const $q = useQuasar();

// Theme State
const isDarkMode = ref($q.dark.isActive);
function toggleTheme(val: boolean) {
  $q.dark.set(val);
}

// Interactive states for showcase
const buttonClickedCount = ref(0);
const buttonLoading = ref(false);
function triggerLoading() {
  buttonLoading.value = true;
  setTimeout(() => {
    buttonLoading.value = false;
    buttonClickedCount.value++;
  }, 1500);
}

const checkboxValue = ref(true);
const switchValue = ref(false);
const sliderValue = ref(42);
const rangeValue = ref({ min: 25, max: 75 });

const selectOptions = [
  'Option 1',
  'Option 2',
  'Option 3',
  { label: 'Option 4 (Disabled)', value: 'opt-4', disable: true },
  { label: 'Option 5', value: 'opt-5' }
];
const selectedValue = ref('Option 1');

// List selection state
const selectedListItem = ref('item-1');
const listItems = [
  { id: 'item-1', label: 'User Settings', icon: 'settings' },
  { id: 'item-2', label: 'File Manager', icon: 'folder' },
  { id: 'item-3', label: 'Web Browser', icon: 'explore' },
  { id: 'item-4', label: 'Command Terminal', icon: 'code' },
  { id: 'item-5', label: 'Software Updates (Disabled)', icon: 'shop', disable: true },
];

const collapseOpen1 = ref(true);
const collapseOpen2 = ref(false);
</script>

<template>
  <div class="basic-controls-zoo">
    <!-- Header with generic theme toggling -->
    <div class="zoo-header">
      <div class="zoo-header__title">Basic Controls Showcase</div>
      <div class="zoo-header__theme-toggle">
        <XSwitch
          v-model="isDarkMode"
          label="Dark Mode"
          @update:model-value="toggleTheme"
        />
      </div>
    </div>

    <!-- Showcase Grid -->
    <div class="zoo-grid">
      
      <!-- Column 1: Buttons -->
      <XCard title="Buttons (<XButton>)">
        <div class="zoo-section">
          <div class="zoo-label">Colors & Sizes</div>
          <div class="zoo-row">
            <XButton label="Default" size="sm" @click="buttonClickedCount++" />
            <XButton label="Primary" color="primary" size="md" @click="buttonClickedCount++" />
            <XButton label="Danger" color="danger" size="lg" @click="buttonClickedCount++" />
          </div>
        </div>

        <div class="zoo-section">
          <div class="zoo-label">Variants & States</div>
          <div class="zoo-row">
            <XButton label="Flat (Ghost)" flat color="primary" />
            <XButton label="Outline" outline color="primary" />
            <XButton label="With Icon" icon="star" color="primary" />
          </div>
          <div class="zoo-row q-mt-sm">
            <XButton label="Disabled" disable color="primary" />
            <XButton label="Click for Loader" :loading="buttonLoading" color="primary" @click="triggerLoading" />
          </div>
        </div>

        <div class="zoo-section q-mt-md">
          <div class="zoo-text-info">
            Buttons clicked: <strong>{{ buttonClickedCount }}</strong> times
          </div>
        </div>
      </XCard>

      <!-- Column 2: Selection & Range Controls -->
      <XCard title="Toggles & Sliders">
        <div class="zoo-section">
          <div class="zoo-label">Boolean Inputs (Inside XWell)</div>
          <XWell>
            <div class="zoo-row gap-lg">
              <XCheckbox v-model="checkboxValue" label="XCheckbox (v-model)" />
              <XCheckbox :model-value="true" disable label="Disabled Checked" />
            </div>
            <div class="zoo-row gap-lg q-mt-md">
              <XSwitch v-model="switchValue" label="XSwitch (v-model)" />
              <XSwitch :model-value="true" disable label="Disabled Checked" />
            </div>
          </XWell>
        </div>

        <div class="zoo-section">
          <div class="zoo-label">Sliders & Ranges</div>
          
          <div class="slider-field">
            <div class="slider-field__header">
              <span>XSlider</span>
              <span class="sdmx-text-mono font-bold">{{ sliderValue }}</span>
            </div>
            <XSlider v-model="sliderValue" :min="0" :max="100" />
          </div>

          <div class="slider-field q-mt-md">
            <div class="slider-field__header">
              <span>XRange</span>
              <span class="sdmx-text-mono font-bold">{{ rangeValue.min }} - {{ rangeValue.max }}</span>
            </div>
            <XRange v-model="rangeValue" :min="0" :max="100" :step="5" />
          </div>
        </div>
      </XCard>

      <!-- Column 3: Selectors & Dropdowns -->
      <XCard title="Selectors & Dropdowns">
        <div class="zoo-section">
          <div class="zoo-label">XSelect (Dropdown Selector)</div>
          <XSelect v-model="selectedValue" :options="selectOptions" />
          <div class="zoo-row q-mt-sm">
            <div class="zoo-text-info">
              Selected value: <strong class="sdmx-text-mono">{{ typeof selectedValue === 'object' ? JSON.stringify(selectedValue) : selectedValue }}</strong>
            </div>
          </div>
        </div>

        <div class="zoo-section">
          <div class="zoo-label">XDropdown (Arbitrary Menu Slot)</div>
          <XDropdown label="Actions Menu" color="default" outline>
            <XListView :bordered="false" dense>
              <XListItem @click="buttonClickedCount++">
                <template #prepend><q-icon name="add" /></template>
                Add Component
              </XListItem>
              <XListItem @click="buttonClickedCount++">
                <template #prepend><q-icon name="edit" /></template>
                Edit Layout
              </XListItem>
              <XListItem disable>
                <template #prepend><q-icon name="delete" /></template>
                Delete Selected (Disabled)
              </XListItem>
            </XListView>
          </XDropdown>
        </div>
      </XCard>

      <!-- Column 4: Lists & Collapse Accordions -->
      <XCard title="Lists & Accordions" class="zoo-card--full-width">
        <div class="zoo-flex-row">
          <!-- Lists Showcase -->
          <div class="zoo-flex-col">
            <div class="zoo-label">XListView (Zebra & Interactive)</div>
            <XListView zebra class="custom-list-view">
              <XListItem
                v-for="item in listItems"
                :key="item.id"
                :active="selectedListItem === item.id"
                :disable="item.disable"
                @click="selectedListItem = item.id"
              >
                <template #prepend>
                  <q-icon :name="item.icon" />
                </template>
                {{ item.label }}
                <template #append>
                  <span v-if="selectedListItem === item.id" class="badge">Active</span>
                  <span v-else class="badge badge--ghost">Tag</span>
                </template>
              </XListItem>
            </XListView>
          </div>

          <!-- Accordions Showcase -->
          <div class="zoo-flex-col">
            <div class="zoo-label">XCollapseItem (Disclosure Panel)</div>
            <XListView class="accordion-list">
              <XCollapseItem v-model="collapseOpen1" label="Sound Preferences" icon="volume_up">
                <div class="accordion-content">
                  <div class="zoo-row gap-lg">
                    <XSwitch :model-value="true" label="Mute Sound Effects" />
                    <XSlider :model-value="65" />
                  </div>
                  <p class="q-mt-sm sdmx-text-caption">
                    Adjust alert volume and select alert sound effects.
                  </p>
                </div>
              </XCollapseItem>

              <XCollapseItem v-model="collapseOpen2" label="Display & Brightness Settings" icon="brightness_6">
                <div class="accordion-content">
                  <div class="zoo-row gap-lg">
                    <XCheckbox :model-value="false" label="Auto Adjust Brightness" />
                    <XCheckbox :model-value="true" label="High Dynamic Display" />
                  </div>
                  <p class="q-mt-sm sdmx-text-caption">
                    Adapt display colors and illumination levels dynamically to ambient light conditions.
                  </p>
                </div>
              </XCollapseItem>

              <XCollapseItem label="Network Diagnostics (Disabled)" icon="wifi_off" disable>
                <div class="accordion-content">
                  This is disabled.
                </div>
              </XCollapseItem>
            </XListView>
          </div>
        </div>
      </XCard>

    </div>
  </div>
</template>

<style scoped lang="scss">
.basic-controls-zoo {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow-y: auto;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: var(--sdmx-color-bg-page);
  color: #1d1d1f;
}

.zoo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);

  &__title {
    font-size: 20px;
    font-weight: 600;
  }
}

// Showcase grid Layout
.zoo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.zoo-card {
  background-color: #ffffff;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 16px;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &--full-width {
    grid-column: 1 / -1;
  }

  &__title {
    margin: 0 0 16px 0;
    font-size: 14px;
    font-weight: 600;
    color: #1d1d1f;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    padding-bottom: 8px;
  }
}

// Inner groupings
.zoo-section {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.zoo-label {
  font-size: 11px;
  font-weight: 700;
  color: #8e8e93;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.zoo-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  &.gap-lg {
    gap: 16px;
  }
}

.zoo-flex-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 20px;
  width: 100%;
}

.zoo-flex-col {
  flex: 1 1 300px;
  display: flex;
  flex-direction: column;
}

// Field layouts
.slider-field {
  &__header {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #555;
    margin-bottom: 4px;
  }
}

.zoo-text-info {
  font-size: 12px;
  color: #555;
}

// List overrides inside Zoo
.custom-list-view {
  height: 180px;
  max-height: 180px;
}

.accordion-list {
  background-color: transparent !important;
  border: 1px solid rgba(0, 0, 0, 0.12) !important;
  border-radius: 6px;
  overflow: hidden;
}

.accordion-content {
  font-size: 12px;
  color: #555;
  line-height: 1.4;
}

// Badge helper
.badge {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 99px;
  background-color: rgba(255, 255, 255, 0.25);
  color: #ffffff;

  &--ghost {
    background-color: rgba(0, 0, 0, 0.05);
    color: #8e8e93;
  }
}
</style>

<style lang="scss">
/* Global overrides to target preferences page elements inside .body--dark class */
.body--dark {
  .basic-controls-zoo {
    color: #f5f5f7 !important;
  }

  .zoo-header {
    border-bottom-color: rgba(255, 255, 255, 0.08) !important;
  }

  .zoo-card {
    background-color: #1a1a1a !important;
    border-color: rgba(255, 255, 255, 0.08) !important;

    &__title {
      color: #f5f5f7 !important;
      border-bottom-color: rgba(255, 255, 255, 0.08) !important;
    }
  }

  .zoo-label {
    color: #a1a1aa !important;
  }

  .slider-field__header {
    color: #ccc !important;
  }

  .zoo-text-info {
    color: #ccc !important;
  }

  .accordion-list {
    border-color: rgba(255, 255, 255, 0.12) !important;
  }

  .accordion-content {
    color: #ccc !important;
  }

  .badge--ghost {
    background-color: rgba(255, 255, 255, 0.08) !important;
    color: #a1a1aa !important;
  }
}
</style>