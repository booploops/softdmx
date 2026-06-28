/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { trpc } from 'src/lib/trpc';

let nextClickId = 0;

interface SerializedMenuItem {
    clickId?: string;
    role?: string;
    type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
    label?: string;
    sublabel?: string;
    toolTip?: string;
    accelerator?: string;
    icon?: string;
    enabled?: boolean;
    visible?: boolean;
    checked?: boolean;
    id?: string;
    submenu?: SerializedMenuItem[];
}

export interface NativeMenu {
    show(x?: number, y?: number): void;
}

export function createMenu(template: FrontendMenuItem[]): NativeMenu {
    return {
        show(x?: number, y?: number) {
            const clickCallbacks = new Map<string, () => void>();

            const serializeTemplate = (items: FrontendMenuItem[]): SerializedMenuItem[] => {
                return items.map((item) => {
                    const serialized: SerializedMenuItem = {
                        role: item.role,
                        type: item.type,
                        label: item.label,
                        sublabel: item.sublabel,
                        toolTip: item.toolTip,
                        accelerator: item.accelerator,
                        icon: item.icon,
                        enabled: item.enabled,
                        visible: item.visible,
                        checked: item.checked,
                        id: item.id,
                    };

                    if (item.click) {
                        const clickId = `click-${nextClickId++}`;
                        clickCallbacks.set(clickId, item.click);
                        serialized.clickId = clickId;
                    }

                    if (item.submenu) {
                        serialized.submenu = serializeTemplate(item.submenu);
                    }

                    return serialized;
                });
            };

            const serialized = serializeTemplate(template);

            const subscription = trpc.showContextMenu.subscribe(
                { template: serialized, x, y },
                {
                    onData(event) {
                        if (event.type === 'click') {
                            const cb = clickCallbacks.get(event.clickId);
                            if (cb) {
                                try {
                                    cb();
                                } catch (err) {
                                    console.error('Error executing menu click callback:', err);
                                }
                            }
                        } else if (event.type === 'close') {
                            setTimeout(() => {
                                clickCallbacks.clear();
                                subscription.unsubscribe();
                            }, 100);
                        }
                    },
                    onError(err) {
                        console.error('Context menu tRPC subscription error:', err);
                        clickCallbacks.clear();
                    },
                }
            );
        }
    };
}
