/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const WorkspaceLayouts = [
  {
    title: "Desk View",
    layout: {
      grid: {
        root: {
          type: "branch",
          data: [
            {
              type: "branch",
              data: [
                {
                  type: "leaf",
                  data: {
                    views: ["panel-fixture-sheet-1782634622587"],
                    activeView: "panel-fixture-sheet-1782634622587",
                    id: "2",
                  },
                  size: 790,
                },
                {
                  type: "leaf",
                  data: {
                    views: ["panel-groups-1782634626224"],
                    activeView: "panel-groups-1782634626224",
                    id: "5",
                  },
                  size: 791,
                },
              ],
              size: 341,
            },
            {
              type: "branch",
              data: [
                {
                  type: "leaf",
                  data: {
                    views: [
                      "panel-programmer-window-1782634632437",
                      "panel-scratch-window-1",
                      "panel-controls-window-1",
                    ],
                    activeView: "panel-programmer-window-1782634632437",
                    id: "4",
                  },
                  size: 790,
                },
                {
                  type: "leaf",
                  data: {
                    views: ["panel-quick-programmer-1782634635888"],
                    activeView: "panel-quick-programmer-1782634635888",
                    id: "6",
                  },
                  size: 791,
                },
              ],
              size: 440,
            },
            {
              type: "leaf",
              data: {
                views: ["panel-playback-rail-window-1782634645720"],
                activeView: "panel-playback-rail-window-1782634645720",
                id: "3",
              },
              size: 243,
            },
          ],
          size: 1581,
        },
        width: 1581,
        height: 1024,
        orientation: "VERTICAL",
      },
      panels: {
        "panel-fixture-sheet-1782634622587": {
          id: "panel-fixture-sheet-1782634622587",
          contentComponent: "WSPanelContent",
          params: {
            path: "/fixture-sheet",
          },
          title: "Fixture Sheet",
        },
        "panel-playback-rail-window-1782634645720": {
          id: "panel-playback-rail-window-1782634645720",
          contentComponent: "WSPanelContent",
          params: {
            path: "/playback-rail-window",
          },
          title: "Playback Rail",
        },
        "panel-programmer-window-1782634632437": {
          id: "panel-programmer-window-1782634632437",
          contentComponent: "WSPanelContent",
          params: {
            path: "/programmer-window",
          },
          title: "Programmer",
        },
        "panel-scratch-window-1": {
          id: "panel-scratch-window-1",
          contentComponent: "WSPanelContent",
          params: {
            path: "/scratch-window",
          },
          title: "Scratch",
        },
        "panel-controls-window-1": {
          id: "panel-controls-window-1",
          contentComponent: "WSPanelContent",
          params: {
            path: "/controls-window",
          },
          title: "Controls",
        },
        "panel-groups-1782634626224": {
          id: "panel-groups-1782634626224",
          contentComponent: "WSPanelContent",
          params: {
            path: "/groups",
          },
          title: "Groups",
        },
        "panel-quick-programmer-1782634635888": {
          id: "panel-quick-programmer-1782634635888",
          contentComponent: "WSPanelContent",
          params: {
            path: "/quick-programmer",
          },
          title: "Quick Programmer",
        },
      },
      activeGroup: "6",
    },
  },
] as const;
