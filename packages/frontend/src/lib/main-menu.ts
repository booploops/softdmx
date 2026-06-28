/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Dialog } from "quasar";
import { useShowStore } from "src/stores/show";
import { useUIStore } from "src/stores/ui";
import { useGridNodeOverlayStore } from "src/stores/gridnode-overlay";
import {
  showSettingsDialog,
  showInterfaceSettingsDialog,
  showThemeSettingsDialog,
  showAudioSettingsDialog,
  showBindingsDialog,
} from "src/lib/CommonDialogs";
import { exampleVrClubShow } from "src/shows/example-vr-club";
import { simpleWashShow } from "src/shows/simple-wash";
import { laserDemoShow } from "src/shows/laser-demo";
import { useRouter } from "vue-router";

type MainMenuItem = {
  label: string;
  icon?: string;
  click?: () => void;
  children?: MainMenuItem[];
};

export function getMainMenu(): MainMenuItem[] {
  const ui = useUIStore();
  const showStore = useShowStore();
  const gridNodeOverlay = useGridNodeOverlayStore();

  return [
    {
      label: "File",
      children: [
        {
          label: "Reload example show",
          icon: "refresh",
          click: () => {
            showStore.loadShow(exampleVrClubShow);
          },
        },
        {
          label: "Load simple wash",
          icon: "light_mode",
          click: () => {
            showStore.loadShow(simpleWashShow);
          },
        },
        {
          label: "Load laser demo",
          icon: "flash_on",
          click: () => {
            showStore.loadShow(laserDemoShow);
          },
        },
        {
          label: "Export YAML",
          icon: "download",
          click: () => {
            const ok = showStore.downloadShow();
            if (!ok) {
              Dialog.create({
                title: "Export Failed",
                message: "Could not export show file.",
              });
            }
          },
        },
        {
          label: "Import YAML",
          icon: "upload",
          click: () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".yml,.yaml";
            input.onchange = async (event) => {
              const file = (event.target as HTMLInputElement).files?.[0];
              if (!file) return;
              try {
                await showStore.loadShowFromFile(file);
              } catch (error) {
                Dialog.create({
                  title: "Import Failed",
                  message:
                    error instanceof Error ? error.message : "Unknown error",
                });
              }
            };
            input.click();
          },
        },
      ],
    },
    {
      label: "Tools",
      children: [
        {
          label: "Cue editor",
          icon: "movie_edit",
          click: () => {
            ui.openDialog("cueEditor");
          },
        },
        {
          label: "Bindings",
          icon: "tune",
          click: () => {
            showBindingsDialog();
          },
        },
        {
          label: "Audio analysis",
          icon: "graphic_eq",
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
          label: "Output & sync",
          icon: "settings_input_component",
          click: () => {
            showSettingsDialog();
          },
        },
        ...(gridNodeOverlay.isAvailable
          ? [
              {
                label: gridNodeOverlay.overlayVisible
                  ? "Hide GridNode overlay"
                  : "Show GridNode overlay",
                icon: "grid_view",
                click: () => {
                  gridNodeOverlay.toggle();
                },
              },
            ]
          : []),
      ],
    },
    {
      label: "Settings",
      children: [
        {
          label: "Interface",
          icon: "dashboard_customize",
          click: () => {
            showInterfaceSettingsDialog();
          },
        },
        {
          label: "Theme",
          icon: "palette",
          click: () => {
            showThemeSettingsDialog();
          },
        },
      ],
    },
    {
      label: "Legacy View",
      click() {
        window.location.href = "/";
      },
    },
  ];
}
