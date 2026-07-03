/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createDialog } from "./Dialog";
import SettingsDialog from "src/components/SettingsDialog.vue";
import InterfaceSettingsDialog from "src/components/InterfaceSettingsDialog.vue";
import ThemeSettingsDialog from "src/components/ThemeSettingsDialog.vue";
import AudioSettingsDialog from "src/components/AudioSettingsDialog.vue";
import { createWorkspaceWithPanels } from "./workspace";
import { useModal } from "vue-final-modal";
import AboutDialog from "src/components/dialogs/AboutDialog.vue";

export function showSettingsDialog() {
  return createDialog({ component: SettingsDialog });
}

export function showInterfaceSettingsDialog() {
  return createDialog({ component: InterfaceSettingsDialog });
}

export function showThemeSettingsDialog() {
  return createDialog({ component: ThemeSettingsDialog });
}

export function showAudioSettingsDialog() {
  return createDialog({ component: AudioSettingsDialog });
}

export function showBindingsDialog() {
  return createWorkspaceWithPanels("Bindings", [
    "/bindings-midi",
    "/bindings-osc",
  ]);
}

export function showAboutDialog() {
  const { close, open } = useModal({
    component: AboutDialog,
    attrs: {
      onConfirm() {
        close();
      },
    },
  });

  open();
}
