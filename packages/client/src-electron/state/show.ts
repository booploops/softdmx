/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { signal } from "alien-signals";
import fs from "fs";
import path from "path";
import {
  createEmptyShow,
  serializeShowDocument,
  validateShowDocument,
  type ShowDocument,
} from "@softdmx/engine";
import { Paths } from "../runtime/paths";
import { rememberRecentShow } from "./recent-shows";

const HISTORY_LIMIT = 100;

function defaultAutosavePath(): string {
  return path.join(Paths.appData, "autosave", "current.yml");
}

function resolveWritePath(candidate: string | null | undefined): string {
  if (candidate && path.isAbsolute(candidate)) {
    return candidate;
  }
  return defaultAutosavePath();
}

export function createShowStore() {
  const document = signal<ShowDocument>(validateShowDocument(createEmptyShow()));
  const isDirty = signal<boolean>(false);
  const filePath = signal<string | null>(null);
  const undoStack = signal<ShowDocument[]>([]);
  const redoStack = signal<ShowDocument[]>([]);

  function cloneDocument(doc: ShowDocument): ShowDocument {
    return JSON.parse(JSON.stringify(doc)) as ShowDocument;
  }

  function loadShow(doc: ShowDocument, pathName: string | null = null) {
    document(validateShowDocument(doc));
    isDirty(false);
    filePath(pathName);
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

  function saveShow(doc: ShowDocument = document(), targetPath: string | null = filePath()): string {
    const writePath = resolveWritePath(targetPath);
    const yaml = serializeShowDocument(doc);
    fs.mkdirSync(path.dirname(writePath), { recursive: true });
    fs.writeFileSync(writePath, yaml, "utf-8");
    document(validateShowDocument(doc));
    filePath(writePath);
    isDirty(false);
    rememberRecentShow({
      path: writePath,
      name: doc.meta.name,
      modified: new Date().toISOString(),
    });
    return writePath;
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
