/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { signal } from "alien-signals";
import { createEmptyShow, validateShowDocument, type ShowDocument } from "@softdmx/engine";

const HISTORY_LIMIT = 100;

export function createShowStore() {
  const document = signal<ShowDocument>(validateShowDocument(createEmptyShow()));
  const isDirty = signal<boolean>(false);
  const filePath = signal<string | null>(null);
  const undoStack = signal<ShowDocument[]>([]);
  const redoStack = signal<ShowDocument[]>([]);

  function cloneDocument(doc: ShowDocument): ShowDocument {
    return JSON.parse(JSON.stringify(doc)) as ShowDocument;
  }

  function loadShow(doc: ShowDocument, path: string | null = null) {
    document(validateShowDocument(doc));
    isDirty(false);
    filePath(path);
    undoStack([]);
    redoStack([]);
  }

  function newShow(showName?: string) {
    document(validateShowDocument(createEmptyShow(showName)));
    isDirty(false);
    filePath(null);
    undoStack([]);
    redoStack([]);
  }

  function updateDocument(nextDoc: ShowDocument) {
    const currentUndo = [...undoStack()];
    currentUndo.push(cloneDocument(document()));
    if (currentUndo.length > HISTORY_LIMIT) {
      currentUndo.shift();
    }
    undoStack(currentUndo);
    redoStack([]);

    document(nextDoc);
    isDirty(true);
  }

  function undo() {
    const currentUndo = [...undoStack()];
    const previous = currentUndo.pop();
    if (!previous) return;

    const currentRedo = [...redoStack()];
    currentRedo.push(cloneDocument(document()));

    undoStack(currentUndo);
    redoStack(currentRedo);
    document(previous);
    isDirty(true);
  }

  function redo() {
    const currentRedo = [...redoStack()];
    const next = currentRedo.pop();
    if (!next) return;

    const currentUndo = [...undoStack()];
    currentUndo.push(cloneDocument(document()));

    undoStack(currentUndo);
    redoStack(currentRedo);
    document(next);
    isDirty(true);
  }

  function saveShow() {
    isDirty(false);
  }

  return {
    document,
    isDirty,
    filePath,
    undoStack,
    redoStack,
    loadShow,
    newShow,
    updateDocument,
    undo,
    redo,
    saveShow,
  };
}

export const showStore = createShowStore();
