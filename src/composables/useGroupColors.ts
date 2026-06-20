/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed } from 'vue';
import { useShowStore } from 'src/stores/show';
import {
  buildFixtureGroupLookup,
  resolveGroupColor,
  type FixtureGroupInfo,
} from 'src/utils/group-colors';

export function useGroupColors() {
  const showStore = useShowStore();

  const groups = computed(() => showStore.document.groups ?? []);

  const fixtureLookup = computed(() => buildFixtureGroupLookup(groups.value));

  function groupColor(groupName: string): string | undefined {
    const index = groups.value.findIndex((group) => group.name === groupName);
    if (index < 0) return undefined;
    const group = groups.value[index];
    if (!group) return undefined;
    return resolveGroupColor(group, index);
  }

  function fixtureGroup(fixtureName: string): FixtureGroupInfo | undefined {
    return fixtureLookup.value.get(fixtureName);
  }

  function fixtureGroupColor(fixtureName: string): string | undefined {
    return fixtureLookup.value.get(fixtureName)?.color;
  }

  return {
    groups,
    fixtureLookup,
    groupColor,
    fixtureGroup,
    fixtureGroupColor,
  };
}
