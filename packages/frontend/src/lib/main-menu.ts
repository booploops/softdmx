/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { createDialog } from "src/lib/Dialog";
import { useShowStore } from "src/stores/show";
import { useUIStore } from "src/stores/ui";
import { useGridNodeOverlayStore } from "src/stores/gridnode-overlay";
import { useDeskViewStore } from "src/stores/desk-view";
import {
  showInterfaceSettingsDialog,
  showThemeSettingsDialog,
  showAudioSettingsDialog,
  showBindingsDialog,
} from "src/lib/CommonDialogs";
import { showSettingsUI } from "./settings-ui";
import { exampleVrClubShow } from "src/shows/example-vr-club";
import { simpleWashShow } from "src/shows/simple-wash";
import { laserDemoShow } from "src/shows/laser-demo";
import StockMessageDialog from "src/components/dialogs/StockMessageDialog.vue";
import DemoShowPickerDialog from "src/components/dialogs/DemoShowPickerDialog.vue";

type MainMenuItem = {
  label: string;
  icon?: string;
  click?: () => void;
  children?: MainMenuItem[];
};

export function getMainMenu(options?: {
  onImportWorkspace?: () => void;
}): MainMenuItem[] {
  const ui = useUIStore();
  const showStore = useShowStore();
  const gridNodeOverlay = useGridNodeOverlayStore();
  const deskView = useDeskViewStore();
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

  async function showMessageDialog(title: string, message: string) {
    await createDialog<boolean>({
      component: StockMessageDialog,
      componentProps: {
        title,
        message,
      },
    });
  }

  async function confirmDiscard(message: string): Promise<boolean> {
    const confirmed = await createDialog<boolean>({
      component: StockMessageDialog,
      componentProps: {
        title: "Discard Unsaved Changes?",
        message,
        confirmLabel: "Discard",
        cancelLabel: "Cancel",
        showCancel: true,
      },
    });
    return confirmed === true;
  }

  function loadDemoShowById(demoId: string) {
    const selectedDemo = demoShowOptions.find((option) => option.value === demoId);
    if (!selectedDemo) return;
    showStore.loadShow(selectedDemo.show);
  }

  return [
    {
      label: "File",
      children: [
        {
          label: "New Show",
          icon: "file-plus",
          click: async () => {
            if (showStore.isDirty) {
              const confirmed = await confirmDiscard(
                "Create a new show and discard current unsaved changes?"
              );
              if (!confirmed) return;
            }
            showStore.newShow();
          },
        },
        {
          label: "Load Demo Show",
          icon: 'sparkles',
          click: async () => {
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
              const confirmed = await confirmDiscard(
                "Load a demo show and discard current unsaved changes?"
              );
              if (!confirmed) return;
            }

            loadDemoShowById(selectedDemoId);
          },
        },
        {
          label: "Export Show",
          icon: 'download',
          click: async () => {
            const ok = showStore.downloadShow();
            if (!ok) {
              await showMessageDialog("Export Failed", "Could not export show file.");
            }
          },
        },
        {
          label: "Open Show",
          icon: 'upload',
          click: async () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".yml,.yaml";
            input.onchange = async (event) => {
              const file = (event.target as HTMLInputElement).files?.[0];
              if (!file) return;

              const loadSelectedShow = async () => {
                try {
                  await showStore.loadShowFromFile(file);
                } catch (error) {
                  await showMessageDialog(
                    "Import Failed",
                    error instanceof Error ? error.message : "Unknown error"
                  );
                }
              };

              if (showStore.isDirty) {
                const confirmed = await confirmDiscard(
                  "Open a show file and discard current unsaved changes?"
                );
                if (!confirmed) return;
              }

              await loadSelectedShow();
            };
            input.click();
          },
        },
        ...(options?.onImportWorkspace
          ? [
              {
                label: "Import Workspace JSON",
                icon: 'upload',
                click: options.onImportWorkspace,
              },
            ]
          : []),
      ],
    },
    {
      label: "Tools",
      children: [
        {
          label: "Cue editor",
          icon: 'movie',
          click: () => {
            ui.openDialog("cueEditor");
          },
        },
        {
          label: "Bindings",
          icon: 'adjustments',
          click: () => {
            showBindingsDialog();
          },
        },
        {
          label: "Audio analysis",
          icon: 'waveform',
          click: () => {
            showAudioSettingsDialog();
          },
        },
      ],
    },
    {
      label: "Output",
      children: [
        {
          label: "Output",
          icon: "output",
          click: () => {
            showSettingsUI("output");
          },
        },
        {
          label: "Sync",
          icon: 'refresh',
          click: () => {
            showSettingsUI("sync");
          },
        },
        ...(gridNodeOverlay.isAvailable
          ? [
              {
                label: gridNodeOverlay.overlayVisible
                  ? "Hide GridNode overlay"
                  : "Show GridNode overlay",
                icon: "layout-grid",
                click: () => {
                  gridNodeOverlay.toggle();
                },
              },
            ]
          : []),
      ],
    },
    ...(showStore.document.general?.debugToolsEnabled ?? true
      ? [
          {
            label: "Debug Tools",
            children: [
              {
                label: "Open DMX Debug Panel",
                icon: "bug",
                click: () => {
                  const hasDebugPane = deskView.activePanes.some((pane) => pane.windowType === "dmx-debug");
                  if (!hasDebugPane) {
                    deskView.addPane("dmx-debug");
                  }
                },
              },
            ],
          },
        ]
      : []),
    {
      label: "Settings",
      children: [
        {
          label: "Interface",
          icon: 'dashboard',
          click: () => {
            showInterfaceSettingsDialog();
          },
        },
        {
          label: "Theme",
          icon: 'palette',
          click: () => {
            showThemeSettingsDialog();
          },
        },
      ],
    },
    {
      label: "Legacy View",
      click() {
        window.location.href = "/legacy";
      },
    },
  ];
}
