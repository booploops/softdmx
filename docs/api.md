# SoftDMX Remote API

Socket.IO and REST on port **5353** by default.

OpenAPI spec: [`openapi/remote-api.yaml`](../openapi/remote-api.yaml).

## Read events (server → client)

| Event | Payload | Description |
|---|---|---|
| `show:state` | Show document (schema 1.5) | Full show document |
| `channels:state` | `ActiveChannel[]` | Merged DMX output |
| `settings:current` | App config | Port and app prefs |
| `scratch:layers` | `{ seq, layers, conflicts, merged }` | Canonical multi-client scratch snapshot |
| `scratch:state` | Same as `scratch:layers` | Alias for scratch snapshot |
| `scratch:conflicts` | `ScratchConflict[]` | Paths with competing client values |
| `scratch:ack` | `{ seq, clientId, appliedAt }` | Per-command acknowledgement |
| `client:identity` | `{ clientId, operatorLabel?, color? }` | Assigned operator identity |
| `programmer-session:arm` | `{ sessionId?, clock? }` | Arm session recording |
| `programmer-session:disarm` | `{ sessionId?, persist? }` | Disarm session recording |

## Write events (client → server)

| Event | Payload | Description |
|---|---|---|
| `show:get` | — | Request current show |
| `show:load` | Show document (schema 1.5) | Load show |
| `show:state` | Show document (schema 1.5) | Broadcast show update |
| `client:hello` | `{ clientId?, operatorLabel?, color? }` | Register operator identity |
| `scratch:set` | `{ path, value, clientId? }` or `{ channels, clientId? }` | Set live scratch channels (server authority) |
| `scratch:clear` | `{ clientId? }` | Clear scratch layer (one client or all) |
| `scratch:clear-client` | — | Clear only the calling client's scratch layer |
| `preset:fire` | `{ presetId, fade? }` | Fire preset with optional fade ms |
| `cue:play` | `{ cueId }` | Start cue playback |
| `cue:stop` | `{ cueId }` | Stop cue |
| `cue:stack:go` | `{ cueId }` | Advance stack cue |
| `blackout` | `boolean` | Blackout on/off |
| `grandmaster` | `0–1` | Grand master level |
| `effect:set` | `{ effectId, enabled }` | Toggle effect |
| `audio:setEnabled` | `{ enabled }` | Enable/disable audio-reactive mappings |
| `audio:mappings:create` | `{ mapping }` | Add one audio mapping |
| `audio:mappings:update` | `{ id, mapping }` | Patch one audio mapping |
| `audio:mappings:delete` | `{ id }` | Remove one audio mapping |

## OSC direct namespace

- `/softdmx/blackout`
- `/softdmx/grandmaster`
- `/softdmx/media/time` (seconds, float)
- `/softdmx/timecode/smpte` (either `secondsFloat` or `hours,minutes,seconds,frames`)
- `/softdmx/fixture/{name}/channel/{index}`
- `/softdmx/group/{name}/master`
- `/softdmx/cue/{id}/go`
- `/softdmx/preset/{id}`
- `/softdmx/scratch/changed` (optional outbound when `softdmx.osc_emit_scratch_changed=1` in localStorage)

SoftDMX also accepts common media-time OSC routes used by Resolume-style controllers, including:

- `/composition/time`
- `/layer{n}/clip/time`
- `/layer{n}/video/time`

If a message includes two numeric args and the first is `0-1`, SoftDMX treats it as normalized progress and multiplies by the second arg (duration) to compute `mediaTime`.

## Timecode Notes and Limits

- Timecode sources (Settings → Show Sync): **OSC**, **LTC** (audio input via `linear-timecode`), or **MTC** (MIDI quarter-frame `0xF1` on enabled MIDI inputs).
- OSC route: `/softdmx/timecode/smpte` — either `secondsFloat` or `hours,minutes,seconds,frames`.
- LTC: select an audio input device, channel (mono/left/right), and gain. Frame rate is auto-detected when possible.
- MTC: enable MIDI inputs in Bindings; quarter-frame messages assemble into SMPTE and update show FPS from rate bits.
- Optional **latency offset (ms)** subtracts delay from incoming timecode before cue crossing evaluation.
- Cue `timecodeIn`/`timecodeOut` are evaluated on forward crossings only (rewind/jump backward does not auto-retrigger past crossings).
- Frame-to-seconds conversion uses show timecode FPS (default `30`, or MTC/LTC-detected rate when available).

## HTTP REST API

Base URL: `http://127.0.0.1:5353/api/v1/remote`

Optional auth (REST and Socket.IO):

- Set `SOFTDMX_API_TOKEN` in the server environment to require auth for all REST routes and Socket.IO connections.
- Send token in `Authorization: Bearer <token>`, `x-api-token: <token>`, or Socket.IO `auth: { token: '<token>' }` on connect.
- Electron passes the env token automatically; browser clients may use `?token=` or `localStorage['softdmx-api-token']`.
- If token auth is enabled and missing/invalid, REST returns `401 Unauthorized` and Socket.IO connections are rejected.

| Method | Route | Body | Description |
|---|---|---|---|
| `GET` | `/show` | — | Get current show document |
| `GET` | `/scratch` | — | Get merged scratch snapshot (`layers`, `conflicts`, `merged`, `seq`) |
| `GET` | `/scratch/clients` | — | List connected clients and per-client layers |
| `GET` | `/sessions` | — | List `timeline.programmerSessions` from loaded show |
| `GET` | `/sessions/:id` | — | Get one programmer session |
| `POST` | `/sessions/arm` | `{ sessionId?, clock? }` | Arm session recording (broadcast) |
| `POST` | `/sessions/disarm` | `{ sessionId?, persist? }` | Disarm session recording (broadcast) |
| `POST` | `/show` | Show document (schema 1.5) | Load full show document |
| `POST` | `/scratch/set` | `{ path, value, attributeType?, clientId? }` or `{ channels, clientId? }` | Set live scratch values (returns `ack`, `seq`) |
| `POST` | `/scratch/clear` | `{ clientId? }` | Clear scratch layer |
| `POST` | `/preset/fire` | `{ presetId, fade? }` | Fire preset |
| `POST` | `/cue/play` | `{ cueId }` | Start cue playback |
| `POST` | `/cue/stop` | `{ cueId }` | Stop cue playback |
| `POST` | `/cue/stack/go` | `{ cueId }` | Advance stack cue |
| `POST` | `/blackout` | `{ value: boolean }` | Toggle blackout |
| `POST` | `/grandmaster` | `{ value: number }` | Set grandmaster (0-1) |
| `POST` | `/audio/enabled` | `{ enabled: boolean }` | Enable/disable audio mappings |
| `POST` | `/audio/mappings` | `{ mapping }` | Create audio mapping |
| `PATCH` | `/audio/mappings/:id` | `{ mapping }` | Update audio mapping fields |
| `DELETE` | `/audio/mappings/:id` | — | Delete audio mapping |
| `POST` | `/channel/set` | `{ path, value, attributeType? }` | Set one channel via scratch |

## CLI examples

Run via:

```bash
yarn cli -- <command> [options]
```

Examples:

```bash
yarn cli -- load-show --file ./shows/club-night.yml
yarn cli -- fire-preset --preset front-wash --fade 500
yarn cli -- play-cue --cue opener
yarn cli -- play-cue --cue opener --stop
yarn cli -- set-channel --fixture Spot1 --channel 1 --value 255
yarn cli -- blackout
yarn cli -- blackout --off
```

## Playback shortcuts

- `Space`: GO on the selected executor slot (or first slot on active page)
- `Escape`: stop all executors/cues
- `PageUp`: previous executor page
- `PageDown`: next executor page
- `B`: toggle output blackout
