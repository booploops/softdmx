#!/usr/bin/env node

/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { readFile } from "node:fs/promises";
import process from "node:process";
import YAML from "yaml";
import { io } from "socket.io-client";

const [, , command, ...restArgs] = process.argv;
const flags = parseFlags(restArgs);
const host = flags.host || process.env.SOFTDMX_HOST || "http://127.0.0.1:5353";

async function main() {
  if (!command || command === "help" || flags.help) {
    printHelp();
    return;
  }

  switch (command) {
    case "load-show":
      await loadShow();
      break;
    case "fire-preset":
      await firePreset();
      break;
    case "play-cue":
      await playCue();
      break;
    case "set-channel":
      await setChannel();
      break;
    case "blackout":
      await blackout();
      break;
    default:
      throw new Error(`Unknown command "${command}". Run "softdmx-cli help".`);
  }
}

async function loadShow() {
  const file = flags.file || flags.f;
  if (!file) {
    throw new Error("Missing --file path for load-show.");
  }

  const raw = await readFile(file, "utf8");
  const parsed = file.endsWith(".json") ? JSON.parse(raw) : YAML.parse(raw);
  await post("/api/v1/remote/show", parsed);
  console.log(`Loaded show from ${file}`);
}

async function firePreset() {
  const presetId = flags.preset || flags.id;
  const fade = flags.fade !== undefined ? Number(flags.fade) : undefined;
  if (!presetId) {
    throw new Error("Missing --preset <id> for fire-preset.");
  }

  await post("/api/v1/remote/preset/fire", {
    presetId,
    ...(Number.isFinite(fade) ? { fade } : {}),
  });
  console.log(`Fired preset ${presetId}`);
}

async function playCue() {
  const cueId = flags.cue || flags.id;
  if (!cueId) {
    throw new Error("Missing --cue <id> for play-cue.");
  }

  if (flags.stop || flags.action === "stop") {
    await post("/api/v1/remote/cue/stop", { cueId });
    console.log(`Stopped cue ${cueId}`);
    return;
  }

  await post("/api/v1/remote/cue/play", { cueId });
  console.log(`Playing cue ${cueId}`);
}

async function setChannel() {
  const value = Number(flags.value);
  const attributeType = flags.attribute || "generic";
  let path = flags.path;

  if (!path) {
    const fixture = flags.fixture;
    const channel = Number(flags.channel);
    if (!fixture || !Number.isFinite(channel) || channel <= 0) {
      throw new Error(
        "set-channel requires either --path show://fixture/1 or both --fixture <name> --channel <1-based>.",
      );
    }
    path = `show://${fixture}/${channel}`;
  }

  if (!Number.isFinite(value)) {
    throw new Error("set-channel requires --value <0-255>.");
  }

  await emitSocket("scratch:set", {
    path,
    value: Math.max(0, Math.min(255, Math.round(value))),
    attributeType,
  });
  console.log(`Set channel ${path} to ${value}`);
}

async function blackout() {
  const value = flags.off ? false : true;
  await post("/api/v1/remote/blackout", { value });
  console.log(value ? "Blackout enabled" : "Blackout disabled");
}

async function post(path, body) {
  const response = await fetch(`${host}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} on ${path}: ${text || response.statusText}`);
  }
  return response;
}

async function emitSocket(event, payload) {
  await new Promise((resolve, reject) => {
    const socket = io(host, {
      transports: ["websocket"],
      reconnection: false,
      timeout: 2500,
    });

    socket.on("connect", () => {
      socket.emit(event, payload);
      setTimeout(() => {
        socket.disconnect();
        resolve(undefined);
      }, 50);
    });

    socket.on("connect_error", (error) => {
      socket.disconnect();
      reject(error);
    });
  });
}

function parseFlags(args) {
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith("-")) continue;

    const stripped = token.replace(/^-+/, "");
    const next = args[i + 1];
    if (!next || next.startsWith("-")) {
      out[stripped] = true;
    } else {
      out[stripped] = next;
      i += 1;
    }
  }
  return out;
}

function printHelp() {
  console.log(`SoftDMX CLI

Usage:
  node scripts/softdmx-cli.mjs <command> [options]

Commands:
  load-show   --file ./show.yml [--host http://127.0.0.1:5353]
  fire-preset --preset preset-id [--fade 1000]
  play-cue    --cue cue-id [--stop]
  set-channel --path show://Fixture/1 --value 255 [--attribute intensity]
              --fixture Fixture --channel 1 --value 255
  blackout    [--off]
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
