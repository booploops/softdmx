# SoftDMX (name not final)

Early-stage software lighting controller built with Vue, Quasar, and Electron. Aimed at approachable desk workflows and virtual-world setups (VRChat/VRSL via GridNode), with network control and hackable YAML show files.

**Stack:** Vue 3 · Quasar · Electron · Node 22

## Quick start

**Build Requirements:** 
- Node.js (Currently Node 22 LTS)
- Zig
- Visual Studio Build Tools (Windows only)

```bash
corepack enable
yarn
yarn dev          # Electron + desk UI
yarn build        # production Electron build
yarn output-node  # headless merge + DMX output
yarn test         # full test suite
```

## What it does

- **Desk** — Live, Timeline, Program, and Setup modes for busking, cues, patch, and video mapping
- **Shows** — YAML import/export, schema 1.5, GDTF fixture import
- **Control** — local UI, touch remote (`/#/remote`), Socket.IO, REST, OSC, MIDI, and CLI
- **Output** — GridNode, Art-Net, sACN, USB DMX; optional headless output node and primary/standby backup
- **Reactive** — audio-driven mappings; live video → pixel maps (webcam, OBS, Syphon, Spout)

Starter shows ship in `src/shows/` (Simple Wash, Laser Demo, Example VR Club).

## Remote and CLI

Default port **5353**.

| Surface | Entry |
|---------|-------|
| Remote UI | `http://<host>:5353/#/remote` |
| GridNode overlay | `http://<host>:5353/source` |
| REST | `http://<host>:5353/api/v1/remote` |
| CLI | `yarn cli -- help` |

API reference: [docs/api.md](docs/api.md). Optional token auth: [docs/security.md](docs/security.md).

## Documentation

Full index: [docs/README.md](docs/README.md)

| Topic | Doc |
|-------|-----|
| Architecture | [docs/architecture.md](docs/architecture.md) |
| Show file schema | [docs/show-schema.md](docs/show-schema.md) |
| Fixtures (YAML / GDTF) | [docs/fixture-yaml.md](docs/fixture-yaml.md) · [docs/fixture-gdtf.md](docs/fixture-gdtf.md) |
| Video / pixel maps | [docs/video-input.md](docs/video-input.md) |
| Headless output node | [docs/output-node.md](docs/output-node.md) |
| OBS + GridNode | [docs/gridnode-obs.md](docs/gridnode-obs.md) |
| Testing | [docs/testing.md](docs/testing.md) |
| Release checklist | [docs/release-checklist.md](docs/release-checklist.md) |

## License

[MPL 2.0](LICENSE)
