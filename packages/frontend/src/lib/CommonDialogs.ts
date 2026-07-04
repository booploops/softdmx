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
import ConfirmDialog from "src/components/dialogs/ConfirmDialog.vue";
import PromptDialog from "src/components/dialogs/PromptDialog.vue";
import WelcomeDialog from "src/components/dialogs/WelcomeDialog.vue";
import DemoShowPickerDialog from "src/components/dialogs/DemoShowPickerDialog.vue";
import { useShowStore } from "src/stores/show";
import { simpleWashShow } from "src/shows/simple-wash";
import { laserDemoShow } from "src/shows/laser-demo";
import { exampleVrClubShow } from "src/shows/example-vr-club";
import ThirdPartyDialog from "src/components/dialogs/ThirdPartyDialog.vue";

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

export function showThirdPartyDialog() {
  const { close, open } = useModal({
    component: ThirdPartyDialog,
    attrs: {
      onConfirm() {
        close();
      },
    },
  });

  open();
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function createConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (value: boolean) => {
      if (!resolved) {
        resolved = true;
        resolve(value);
      }
    };

    const { open, close } = useModal({
      component: ConfirmDialog,
      attrs: {
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        onConfirm() {
          safeResolve(true);
          close();
        },
        onCancel() {
          safeResolve(false);
          close();
        },
      },
    });

    open();
  });
}

export interface PromptOptions {
  title: string;
  message: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function createPrompt(
  options: PromptOptions,
): Promise<string | undefined> {
  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (value: string | undefined) => {
      if (!resolved) {
        resolved = true;
        resolve(value);
      }
    };

    const { open, close } = useModal({
      component: PromptDialog,
      attrs: {
        title: options.title,
        message: options.message,
        placeholder: options.placeholder,
        initialValue: options.initialValue,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        onConfirm(val: string) {
          safeResolve(val);
          close();
        },
        onCancel() {
          safeResolve(undefined);
          close();
        },
      },
    });

    open();
  });
}

const demoShowOptions = [
  {
    label: "Simple Wash",
    value: "simple-wash",
    icon: "sun",
    show: simpleWashShow,
  },
  {
    label: "Laser Demo",
    value: "laser-demo",
    icon: "bolt",
    show: laserDemoShow,
  },
  {
    label: "VR Club",
    value: "vr-club",
    icon: "nightlife",
    show: exampleVrClubShow,
  },
] as const;

export async function showLoadDemoDialog() {
  const showStore = useShowStore();
  const selectedDemoId = await createDialog<string>({
    component: DemoShowPickerDialog,
    componentProps: {
      title: "Load Demo Show",
      message: "Choose a demo show to load.",
      options: demoShowOptions,
    },
  });

  if (!selectedDemoId) {
    return;
  }

  if (showStore.isDirty) {
    const confirmed = await createConfirm({
      title: "Discard Unsaved Changes?",
      message: "Load a demo show and discard current unsaved changes?",
      confirmLabel: "Discard",
      cancelLabel: "Cancel",
    });
    if (!confirmed) return;
  }

  const selectedDemo = demoShowOptions.find(
    (option) => option.value === selectedDemoId,
  );
  if (selectedDemo) {
    showStore.loadShow(selectedDemo.show);
  }
}

export function showWelcomeDialog() {
  const { close, open } = useModal({
    component: WelcomeDialog,
    attrs: {
      onConfirm() {
        close();
      },
      async onCreateNewShow() {
        close();
        const showStore = useShowStore();
        if (showStore.isDirty) {
          const confirmed = await createConfirm({
            title: "Discard Unsaved Changes?",
            message: "Create a new show and discard current unsaved changes?",
            confirmLabel: "Discard",
            cancelLabel: "Cancel",
          });
          if (!confirmed) return;
        }
        showStore.newShow();
      },
      onLoadDemoShow() {
        close();
        showLoadDemoDialog();
      },
      onConfigureBindings() {
        close();
        showBindingsDialog();
      },
      onConfigureThemes() {
        close();
        showThemeSettingsDialog();
      },
    },
  });

  open();
}
