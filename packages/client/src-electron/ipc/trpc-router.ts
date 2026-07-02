/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { Menu, BrowserWindow, dialog, type IpcMainInvokeEvent } from "electron";
import * as fs from "fs/promises";

export interface CreateContextOptions {
  event: IpcMainInvokeEvent;
}

export async function createContext({ event }: CreateContextOptions) {
  return {
    event,
    window: BrowserWindow.fromWebContents(event.sender) ?? undefined,
  };
}

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

class MenuEventEmitter {
  private queue: any[] = [];
  private resolveNext: ((value: any) => void) | null = null;
  private done = false;

  push(value: any) {
    if (this.resolveNext) {
      this.resolveNext({ value, done: false });
      this.resolveNext = null;
    } else {
      this.queue.push(value);
    }
  }

  finish() {
    this.done = true;
    if (this.resolveNext) {
      this.resolveNext({ done: true, value: undefined });
      this.resolveNext = null;
    }
  }

  [Symbol.asyncIterator]() {
    return {
      next: () => {
        if (this.queue.length > 0) {
          return Promise.resolve({ value: this.queue.shift(), done: false });
        }
        if (this.done) {
          return Promise.resolve({ done: true, value: undefined });
        }
        return new Promise<any>((resolve) => {
          this.resolveNext = resolve;
        });
      },
      return: () => {
        this.done = true;
        return Promise.resolve({ done: true, value: undefined });
      },
    };
  }
}

const SerializedMenuItemSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    clickId: z.string().optional(),
    role: z.string().optional(),
    type: z.enum(["normal", "separator", "submenu", "checkbox", "radio"]).optional(),
    label: z.string().optional(),
    sublabel: z.string().optional(),
    toolTip: z.string().optional(),
    accelerator: z.string().optional(),
    icon: z.string().optional(),
    enabled: z.boolean().optional(),
    visible: z.boolean().optional(),
    checked: z.boolean().optional(),
    id: z.string().optional(),
    submenu: z.array(SerializedMenuItemSchema).optional(),
  })
);

function toPlainAsyncIterable<T>(iterable: AsyncIterable<T>): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      const iterator = iterable[Symbol.asyncIterator]();
      return {
        async next() {
          return iterator.next();
        },
        async return() {
          if (iterator.return) {
            return iterator.return();
          }
          return { done: true, value: undefined as any };
        }
      };
    }
  };
}

export const appRouter = router({
  showContextMenu: publicProcedure
    .input(
      z.object({
        template: z.array(SerializedMenuItemSchema),
        x: z.number().optional(),
        y: z.number().optional(),
      })
    )
    .subscription(({ input, ctx }) => {
      const win = ctx.window;
      if (!win) {
        return {
          async *[Symbol.asyncIterator]() {}
        };
      }

      async function* runSubscription() {
        const emitter = new MenuEventEmitter();

        const convertTemplate = (items: any[]): any[] => {
          return items.map((item) => {
            const menuItem: any = {
              role: item.role,
              type: item.type,
              label: item.label,
              sublabel: item.sublabel,
              toolTip: item.toolTip,
              accelerator: item.accelerator,
              enabled: item.enabled,
              visible: item.visible,
              checked: item.checked,
              id: item.id,
            };

            if (item.clickId) {
              menuItem.click = () => {
                emitter.push({ type: "click", clickId: item.clickId });
              };
            }

            if (item.submenu) {
              menuItem.submenu = convertTemplate(item.submenu);
            }

            return menuItem;
          });
        };

        const menu = Menu.buildFromTemplate(convertTemplate(input.template));

        menu.popup({
          window: win,
          x: input.x,
          y: input.y,
          callback: () => {
            emitter.push({ type: "close" });
            emitter.finish();
          },
        });

        for await (const event of emitter) {
          yield event;
        }
      }

      return toPlainAsyncIterable(runSubscription());
    }),

  exportWorkspace: publicProcedure
    .input(
      z.object({
        title: z.string(),
        layout: z.any(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const win = ctx.window;
      if (!win) return { success: false, error: "No window found" as string | undefined };

      const result = await dialog.showSaveDialog(win, {
        title: "Export Workspace JSON",
        defaultPath: `${input.title}.json`,
        filters: [{ name: "JSON Files", extensions: ["json"] }],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: undefined as string | undefined };
      }

      try {
        await fs.writeFile(
          result.filePath,
          JSON.stringify(
            {
              title: input.title,
              layout: input.layout,
            },
            null,
            2
          ),
          "utf-8"
        );
        return { success: true, error: undefined as string | undefined };
      } catch (err: any) {
        return { success: false, error: (err.message || String(err)) as string | undefined };
      }
    }),

  importWorkspace: publicProcedure
    .mutation(async ({ ctx }) => {
      const win = ctx.window;
      if (!win) return { success: false, error: "No window found" as string | undefined, data: undefined as any };

      const result = await dialog.showOpenDialog(win, {
        title: "Import Workspace JSON",
        filters: [{ name: "JSON Files", extensions: ["json"] }],
        properties: ["openFile"],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: undefined as string | undefined, data: undefined as any };
      }

      try {
        const content = await fs.readFile(result.filePaths[0], "utf-8");
        const parsed = JSON.parse(content);
        return { success: true, data: parsed, error: undefined as string | undefined };
      } catch (err: any) {
        return { success: false, error: (err.message || String(err)) as string | undefined, data: undefined as any };
      }
    }),
});

export type AppRouter = typeof appRouter;
