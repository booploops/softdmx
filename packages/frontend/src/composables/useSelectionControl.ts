/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import type { ShowfileFixtureMapped, WidgetConfiguration } from '@softdmx/engine';
import { useDMXStore } from 'src/stores/dmx';
import { useSelectionStore } from 'src/stores/selection';
import { useProgrammerStore } from 'src/stores/programmer';
import {
  buildGroupControlFixture,
  filterWidgetsForFeatureGroup,
  selectionSummaryLabel,
} from 'src/utils/selection-controls';

export function useSelectionControl() {
  const dmx = useDMXStore();
  const selection = useSelectionStore();
  const programmer = useProgrammerStore();
  const { selectedFixtures, selectedGroups } = storeToRefs(selection);

  function getSelectedFixtureNames(): string[] {
    const show = dmx.showDocument;
    if (!show) return [];

    const names = new Set<string>();
    for (const fixtureName of selectedFixtures.value) {
      names.add(fixtureName);
    }
    for (const groupName of selectedGroups.value) {
      const group = show.groups.find((entry) => entry.name === groupName);
      if (!group) continue;
      for (const fixtureName of group.fixtures) {
        names.add(fixtureName);
      }
    }
    return Array.from(names);
  }

  const selectedFixtureNames = computed(() => getSelectedFixtureNames());

  const controlFixture = computed((): ShowfileFixtureMapped | null => {
    const names = selectedFixtureNames.value;
    if (names.length === 0) return null;

    const template = dmx.showfileFixturesMapped.find((fixture) => fixture.fixtureName === names[0]);
    if (!template) return null;

    const onlyOneGroup =
      selectedGroups.value.size === 1 && selectedFixtures.value.size === 0 && names.length > 0;
    if (onlyOneGroup) {
      const groupName = [...selectedGroups.value][0]!;
      return buildGroupControlFixture(groupName, template);
    }

    if (names.length === 1) {
      return template;
    }

    return {
      ...template,
      fixtureName: `${names.length} fixtures (selection)`,
    };
  });

  const controlWidgets = computed((): WidgetConfiguration[] => {
    const fixture = controlFixture.value;
    if (!fixture) return [];
    const widgets = fixture.def.widgets ?? [];
    return filterWidgetsForFeatureGroup(widgets, programmer.activeFeatureGroup);
  });

  const selectionLabel = computed(() =>
    selectionSummaryLabel(selectedFixtures.value.size, selectedGroups.value.size)
  );

  const hasSelection = computed(() => selectedFixtureNames.value.length > 0);

  return {
    controlFixture,
    controlWidgets,
    selectionLabel,
    hasSelection,
    selectedFixtureNames,
  };
}
