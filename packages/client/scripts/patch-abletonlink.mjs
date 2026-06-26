#!/usr/bin/env node

/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const clientRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(clientRoot, "package.json"));

let headerPath;
try {
  headerPath = join(
    dirname(require.resolve("abletonlink/package.json")),
    "src/napi-abletonlink.hpp",
  );
} catch {
  process.exit(0);
}

if (!existsSync(headerPath)) {
  process.exit(0);
}

let source = readFileSync(headerPath, "utf8");
const marker = "shutdown_callback_thread";

if (source.includes(marker)) {
  console.log("patch-abletonlink: shutdown patch already applied");
  process.exit(0);
}

// Older patch detached the worker thread, which leaves it running through process exit.
source = source.replace(
  "callback_thread() = std::thread(callback_handler);\n                callback_thread().detach();\n                b = false;",
  "callback_thread_running().store(true, std::memory_order_relaxed);\n                callback_thread() = std::thread(callback_handler);\n                b = false;",
);

if (!source.includes("#include <atomic>")) {
  source = source.replace("#include <mutex>", "#include <mutex>\n#include <atomic>");
}

source = source.replace(
  `        static void callback_handler() {
            while (true) {
                std::lock_guard<std::mutex> sl(bbb_mutex());
                while(!bbb_tempo_queue().empty()) {
                    auto &&front = bbb_tempo_queue().front();
                    bbb_tempo_queue().pop();
                    if(bbb_tempo_queue().empty()) {
                        front.that->tempoChanged(front.bpm);
                    }
                }
                while(!bbb_peers_queue().empty()) {
                    auto &&front = bbb_peers_queue().front();
                    bbb_peers_queue().pop();
                    if(bbb_peers_queue().empty()) {
                        front.that->numPeersChanged(front.numPeers);
                    }
                }
                while(!bbb_is_playing_queue().empty()) {
                    auto &&front = bbb_is_playing_queue().front();
                    bbb_is_playing_queue().pop();
                    if(bbb_is_playing_queue().empty()) {    
                        front.that->playStateChanged(front.isPlaying);
                    }
                }
                std::this_thread::sleep_for( std::chrono::milliseconds(1) );
           }
        }
        static std::thread &callback_thread() {
            static std::thread th;
            return th;
        }`,
  `        static std::atomic<bool> &callback_thread_running() {
            static std::atomic<bool> running{false};
            return running;
        }

        static void shutdown_callback_thread() {
            if (!callback_thread_running().exchange(false, std::memory_order_relaxed)) {
                return;
            }
            auto &thread = callback_thread();
            if (thread.joinable()) {
                thread.join();
            }
        }

        static void callback_handler() {
            while (callback_thread_running().load(std::memory_order_relaxed)) {
                std::lock_guard<std::mutex> sl(bbb_mutex());
                while(!bbb_tempo_queue().empty()) {
                    auto &&front = bbb_tempo_queue().front();
                    bbb_tempo_queue().pop();
                    if(bbb_tempo_queue().empty()) {
                        front.that->tempoChanged(front.bpm);
                    }
                }
                while(!bbb_peers_queue().empty()) {
                    auto &&front = bbb_peers_queue().front();
                    bbb_peers_queue().pop();
                    if(bbb_peers_queue().empty()) {
                        front.that->numPeersChanged(front.numPeers);
                    }
                }
                while(!bbb_is_playing_queue().empty()) {
                    auto &&front = bbb_is_playing_queue().front();
                    bbb_is_playing_queue().pop();
                    if(bbb_is_playing_queue().empty()) {    
                        front.that->playStateChanged(front.isPlaying);
                    }
                }
                std::this_thread::sleep_for( std::chrono::milliseconds(1) );
           }
        }
        static std::thread &callback_thread() {
            static std::thread th;
            return th;
        }`,
);

source = source.replace(
  `            static bool b{true};
            if(b) {
                callback_thread() = std::thread(callback_handler);
                b = false;
            }`,
  `            static bool b{true};
            if(b) {
                callback_thread_running().store(true, std::memory_order_relaxed);
                callback_thread() = std::thread(callback_handler);
                b = false;
            }`,
);

source = source.replace(
  `            exports.Set(is_audio_thread ? "AbletonLinkAudio" : "AbletonLink",
                        func);
            return exports;
        }`,
  `            exports.Set(is_audio_thread ? "AbletonLinkAudio" : "AbletonLink",
                        func);

            static bool cleanup_registered{false};
            if (!cleanup_registered) {
                cleanup_registered = true;
                napi_add_env_cleanup_hook(env, [](void *) {
                    AbletonLink<is_audio_thread>::shutdown_callback_thread();
                }, nullptr);
            }

            return exports;
        }`,
);

if (!source.includes(marker)) {
  console.error("patch-abletonlink: failed to apply shutdown patch");
  process.exit(1);
}

writeFileSync(headerPath, source);
console.log("patch-abletonlink: applied shutdown patch");
