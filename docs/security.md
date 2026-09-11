# Security

## Content Security Policy

The local HTTP server and Electron session send a CSP:

```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval'
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob:
connect-src 'self' ws: wss: http://127.0.0.1:5353 http://localhost:5353
font-src 'self' data:
object-src 'none'
base-uri 'self'
frame-ancestors 'none'
```

`unsafe-inline` / `unsafe-eval` are required for the Vue/Vite renderer. Dev builds also allow the Vite origin (`APP_URL`, default `http://127.0.0.1:9000`).

## Bind address

The server binds **127.0.0.1** by default. Enable **Settings → Output → Listen on all interfaces** (`remote.listenRemote`) and restart to bind `0.0.0.0` for LAN remotes. Socket.IO CORS allows localhost (and the Vite origin in dev) unless remote listen is on.

## Remote API auth

Electron generates an API token on first run and stores it in `config.toml` (`remote.apiToken`). `SOFTDMX_API_TOKEN` overrides that token when set.

Clients can send this token using:

- `Authorization: Bearer <token>`, or
- `x-api-token: <token>` header (REST and Socket.IO handshake), or
- Socket.IO `auth: { token: '<token>' }` on connect

The Electron renderer receives the token via `electronAPI.getRemoteApiToken()`. Browser remote clients may pass `?token=` in the URL or set `localStorage['softdmx-api-token']`. The CLI accepts `--token` or `SOFTDMX_API_TOKEN`.

Without a valid token (when one is configured), requests return `401 Unauthorized`. In-process tests that never load Electron config still run without a required token unless `SOFTDMX_API_TOKEN` is set.

REST is limited to 240 requests / 60s per token or IP. Socket.IO command handlers (`scratch:*`, `show:load`, …) use the same limit; `channels:state` is not limited so DMX refresh is not starved.

`show:state` / `showfile:update` reject payloads whose `version` is not a supported show schema version.
