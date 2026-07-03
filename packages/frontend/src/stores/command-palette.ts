/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { defineStore } from "pinia";
import { shallowRef, triggerRef } from "vue";
import type { NinjaKeys } from "ninja-keys";

type NinjaKeysCommand = NinjaKeys["data"][number];

export const useCommandPaletteStore = defineStore("command-palette", () => {
  const commands = shallowRef<NinjaKeysCommand[]>([]);
  let openCallback: (() => void) | null = null;

  function setOpenCallback(cb: (() => void) | null) {
    openCallback = cb;
  }

  function open() {
    if (openCallback) {
      openCallback();
    }
  }

  function add(command: NinjaKeysCommand) {
    commands.value.push(command);
    triggerRef(commands);
  }

  function remove(command: NinjaKeysCommand) {
    commands.value.splice(commands.value.indexOf(command), 1);
    triggerRef(commands);
  }

  return {
    commands,
    add,
    remove,
    setOpenCallback,
    open,
  };
});

