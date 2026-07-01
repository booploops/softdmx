/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed } from 'vue';
import type { DeskPane, ProgrammerPaneOptions } from '@softdmx/engine';
import { DEFAULT_PROGRAMMER_PANE_OPTIONS } from '@softdmx/engine';
import { useDeskViewStore } from 'src/stores/desk-view';
import { useShowStore } from 'src/stores/show';

function isProgrammerPane(pane: DeskPane): boolean {
  return pane.windowType === 'programmer' || pane.windowType === 'quick-programmer';
}

export function useProgrammerPaneOptions(paneId: string) {
  const deskView = useDeskViewStore();
  const showStore = useShowStore();

  const pane = computed(() => deskView.activePanes.find((entry) => entry.id === paneId));

  const options = computed<ProgrammerPaneOptions>(() => ({
    ...DEFAULT_PROGRAMMER_PANE_OPTIONS,
    ...(pane.value?.options as ProgrammerPaneOptions | undefined),
  }));

  function updateOptions(patch: Partial<ProgrammerPaneOptions>) {
    const targetPane = pane.value;
    if (!targetPane || !isProgrammerPane(targetPane)) return;

    showStore.updateDocument((doc) => {
      const desk = doc.desk;
      if (!desk) return;

      for (const view of desk.views) {
        const paneIndex = view.panes.findIndex((entry) => entry.id === paneId);
        if (paneIndex < 0) continue;

        const current = view.panes[paneIndex]!;
        view.panes[paneIndex] = {
          ...current,
          options: {
            ...DEFAULT_PROGRAMMER_PANE_OPTIONS,
            ...(current.options as ProgrammerPaneOptions | undefined),
            ...patch,
          },
        };
        break;
      }
    });
  }

  return {
    pane,
    options,
    updateOptions,
  };
}
