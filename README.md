# SoftDMX (name not final)

> This project is still in very early development.

SoftDMX is an easy-to-use, hackable software lighting controller built with Vue, Quasar, and Electron.
It is designed to be approachable and network-friendly for desktop and virtual-world workflows — a custom lighting console you can run across a range of devices.

## What is this?

The SoftDMX project aims to lower the barrier to entry for lighting control, particularly in virtual environments like VRChat, without being centered around professional hardware consoles alone.

Current goals:

- A primarily software-driven lighting controller
- Modular with in- and out-of-tree addons and plugins
- Easily programmable and replayable cues
- Native VRSL support via GridNode, with common fixtures bundled out of the box
- Networked control over WebSockets, REST, OSC, and MIDI
- Intuitive controls and widgets for different fixture types
- Multiple output formats: GridNode, Art-Net, sACN, and DMX USB (where supported)
- Cross-platform

## Core technologies

- [Vue 3](https://vuejs.org/)
- [Quasar Framework](https://quasar.dev/)
- [Electron](https://www.electronjs.org/)

## Feature highlights

- Live and Show workspace modes with mode-aware tabs.
- Built-in starter shows: Simple Wash, Laser Demo, and Example VR Club.
- YAML show import/export and YAML fixture plugin support.
- **GDTF fixture import/export** — load `.gdtf`, map to editable YAML, export round-trip from Patch.
- **Programmer v2** — feature groups, Store/Update/Merge/Remove, preset pool slots, align/wings.
- Remote control UI at `/#/remote` (route `/remote`) for phones/tablets.
- Real-time control over Socket.IO, REST, OSC, MIDI, and local UI.
- **Live video → pixel map** color matching (webcam, OBS Virtual Camera, Syphon, Spout) with draggable sample regions for Resolume workflows.
- Audio-reactive mappings (RMS/peak/bands/beat) for fixtures, groups, effects, executors, and submasters.
- Executor pages and slots for cue stack/toggle/flash/latch workflows.
- **Show schema 1.5** with preset pools, cue parts, attribute features, backup config, and multi-user session epoch.
- **Preset pools** — named slot grids for store/recall by pool + index.
- **Cue parts & tracking v2** — sequential stack parts with cross-cue tracking state.
- **Phaser spread & wings** — linear/random/reverse spread with wing phase offsets (no 3D viz).
- **Align / wings** — selection-based fixture alignment helpers for programmer workflows.
- **Headless output node** — merge + DMX without the full desk UI (`yarn output-node`).
- **Primary/standby backup** — hot-backup pairing with heartbeat and takeover modes.
- **Universe health** — per-destination send FPS, overflow, and online status.

## Quick start

### Requirements

- Node.js 22+ (recommended via [`fnm`](https://github.com/Schniz/fnm))
- Corepack-enabled Yarn 4.9+
- **Electron 40+** for desktop builds (Syphon/Spout native modules)

### Install

```bash
npm i -g corepack
corepack enable
yarn
```

### Run in development (Electron + UI)

```bash
yarn dev
```

### Build targets

```bash
yarn build       # Electron production build
yarn build:spa   # SPA/web build
yarn output-node # Headless merge + DMX output node (Electron)
```

### Test

```bash
yarn test
```

Smoke and load-focused checks included in the suite:

```bash
node --experimental-strip-types --test test/e2e-smoke.mjs
node --experimental-strip-types --test test/load-merge.test.ts
```

## CI

Pushes run `.github/workflows/ci.yml`:

- **ubuntu-latest:** `yarn test` (GDTF import/export, programmer v2, schema 1.5, engine tests), `yarn build:spa`
- **macos-latest:** `yarn build` (Electron + native modules)

See [docs/video-input.md](docs/video-input.md) for live video / pixel map setup.
See [docs/output-node.md](docs/output-node.md) for headless output node and primary/standby backup.

## Desk modes

SoftDMX uses top-level desk modes (master bar):

- **Live** — busking views + playback rail
- **Timeline** — set timeline editor
- **Program** — presets, cues, effects, executors
- **Setup** — patch, **video mapping**, show file

## Legacy tabs reference

Older documentation may refer to these tabs:

- `Channels` - direct channel-level control.
- `Groups` - grouped fixture control and masters.
- `Widgets` - fixture widgets (for example dimmer/color/movement).
- `Presets` - save and trigger reusable looks.
- `Show` - show-level editing tools.
- `Patch` - fixture patching and output assignment (Live mode only).

Mode behavior:

- `Live` mode: `Channels`, `Groups`, `Widgets`, `Presets`, `Show`, `Patch`
- `Show` mode: `Channels`, `Groups`, `Widgets`, `Presets`, `Show`

## Remote control

- URL: `http://<host>:<port>/#/remote` (default port is `5353`)
- Designed for touch devices
- Includes grand master, blackout, preset fire, cue go/stop, and audio meter panels

## CLI

SoftDMX ships a CLI wrapper:

```bash
yarn cli -- <command> [options]
```

Common commands:

- `load-show --file ./show.yml`
- `fire-preset --preset <id> [--fade 500]`
- `play-cue --cue <id> [--stop]`
- `set-channel --fixture <name> --channel <index> --value <0-255>`
- `set-channel --path show://Fixture/1 --value <0-255>`
- `blackout [--off]`

## Audio-reactivity

Audio mappings can target:

- Fixture attributes
- Group-level targets
- Effect parameters
- Executor targets
- Submaster targets

Available sources:

- `rms`
- `peak`
- `beat`
- `band` (`bandIndex` 0-3)

## Executors

Show files can define executor banks with:

- `pages` and `activePage`
- slot records (`page`, `index`, `name`, `cueId`)
- per-slot mode (`go`, `toggle`, `flash`, `latch`)
- fade/release timing controls
- optional submaster linkage

## YAML fixtures and show documents

- Fixture format: see `docs/fixture-yaml.md`
- GDTF import/export: see `docs/fixture-gdtf.md`
- Show document schema (`ShowDocumentV1.5`): see `docs/show-schema.md`

## Additional docs

- Remote API reference: `docs/api.md`
- Headless output node: `docs/output-node.md`
- GridNode OBS setup: `docs/gridnode-obs.md`
- Release checklist: `docs/release-checklist.md`
- Security notes: `docs/security.md`

## License

This project is licensed under the Mozilla Public License 2.0 — see the [LICENSE](LICENSE) file for details.
