/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ExecutorSlot } from "../show/document.ts";

export type ExecutorSlotContentType = "cue" | "preset" | "effect" | "audio" | "none";

export function resolveExecutorSlotContentType(slot: ExecutorSlot): ExecutorSlotContentType {
  if (slot.cueId) return "cue";
  if (slot.presetId) return "preset";
  if (slot.effectId) return "effect";
  if (slot.audioMappingId) return "audio";
  if (slot.contentType) return slot.contentType;
  return "none";
}

export function clearExecutorSlotContent(slot: ExecutorSlot): void {
  delete slot.contentType;
  delete slot.cueId;
  delete slot.presetId;
  delete slot.effectId;
  delete slot.audioMappingId;
}

export function assignExecutorSlotContent(
  slot: ExecutorSlot,
  type: ExecutorSlotContentType,
  id?: string,
): void {
  clearExecutorSlotContent(slot);
  if (type === "none") return;

  slot.contentType = type;
  if (!id) return;

  if (type === "cue") slot.cueId = id;
  else if (type === "preset") slot.presetId = id;
  else if (type === "effect") slot.effectId = id;
  else if (type === "audio") slot.audioMappingId = id;
}
