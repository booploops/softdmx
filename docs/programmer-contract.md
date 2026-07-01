# Programmer contract

This document describes the programmer scratch write contract, session recording semantics, and multi-user behavior for SoftDMX integrators.

## Scratch writes

Every scratch mutation carries optional metadata (`ScratchWriteMeta`):

| Field | Description |
|---|---|
| `source` | Origin of the write (`programmer`, `attribute-control`, `api`, `osc`, etc.) |
| `clientId` | Stable operator client identity from server handshake |
| `operatorLabel` | Human-readable operator name |
| `color` | UI attribution color |
| `seq` | Monotonic server-assigned sequence number |

Local UI applies writes optimistically. The Electron server owns canonical per-client scratch state and broadcasts `scratch:layers` snapshots with merged output and conflicts.

## Conflict resolution

`show.programmer.conflictMode` controls same-path merges across client layers:

| Mode | Behavior |
|---|---|
| `attribute-merge` (default) | HTP for dimmer/color, LTP for position and other features |
| `last-writer` | Highest `seq` wins |
| `operator-priority` | Highest operator `priority` wins |

Conflicts are returned in `scratch:layers` / `scratch:conflicts` payloads as `ScratchConflict[]`.

## Session recording

Programmer sessions are stored in `show.timeline.programmerSessions[]`. Each session contains timestamped events with optional `clientId` for per-operator transcripts.

### Temporal policies

`SessionRecordingPolicy` fields (configured in `programmer-session` store):

| Field | Default | Description |
|---|---|---|
| `coalesceMs` | 80 | Coalesce rapid channel writes on the same path |
| `captureLastMs` | 30000 | Rolling capture window hint for crash recovery |
| `keyframeIdleMs` | 500 | Idle threshold for keyframe granularity |
| `semanticOnly` | false | When true, only semantic events (`store`, `marker`, etc.) are recorded |

On disarm, sessions persist to the show document and create/update automation track clips on the set timeline.

## Multi-user handshake

1. Client connects via Socket.IO
2. Client emits `client:hello` with optional `operatorLabel` and `color`
3. Server responds with `client:identity` (`clientId`, profile fields)
4. Server sends initial `scratch:layers` snapshot

Scratch commands (`scratch:set`, `scratch:clear`, `scratch:clear-client`) route through server authority. Clients receive `scratch:ack` with assigned `seq`.

## REST surface

See [api.md](./api.md) for `GET /scratch`, `GET /scratch/clients`, and session arm/disarm routes.

## OSC (optional)

When `localStorage['softdmx.osc_emit_scratch_changed'] = '1'`, scratch writes from OSC mappings emit `/softdmx/scratch/changed` with `[path, value]`.
