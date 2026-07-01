# Multi-user scratch architecture

SoftDMX uses a **server-authoritative** scratch model for multi-client programming.

## Authority

The Electron main process owns canonical scratch state via `scratch-authority.ts`. Renderers and remote clients send commands; the server assigns monotonic `seq` values and broadcasts `scratch:layers` snapshots.

## Per-client layers

Each connected client has its own scratch layer (`ScratchClientLayer`). Layers are merged at output using `mergeClientScratchLayers()` in the engine.

## Conflict resolution

`show.programmer.conflictMode` controls same-path merges:

| Mode | Behavior |
|------|----------|
| `attribute-merge` (default) | HTP for dimmer/color, LTP for position and other features |
| `last-writer` | Highest `seq` wins |
| `operator-priority` | Highest operator `priority` wins |

Conflicts (multiple clients, different values on same path) are surfaced as `ScratchConflict` for UI resolution.

## Client identity

On connect, clients send `client:hello` with optional `operatorLabel` and `color`. Stable operator profiles can be defined in `show.programmer.operators[]`.

## Session recording

Programmer session events include `clientId` for per-operator busk transcripts and bake workflows.
