# Security

## Content Security Policy

Production Electron serves the UI from a local HTTP server. CSP is not configured yet — add a policy before shipping production builds.

Suggested baseline:

```
default-src 'self'
script-src 'self'
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob:
connect-src 'self' ws: wss: http://127.0.0.1:5353
font-src 'self' data:
object-src 'none'
base-uri 'self'
frame-ancestors 'none'
```

Extend directives only when adding external APIs or CDNs.

## Remote API auth

For REST routes under `/api/v1/remote` and the Socket.IO server on port 5353, set `SOFTDMX_API_TOKEN` to require token auth.
Clients can send this token using:

- `Authorization: Bearer <token>`, or
- `x-api-token: <token>` header (REST and Socket.IO handshake), or
- Socket.IO `auth: { token: '<token>' }` on connect

The Electron renderer receives the token automatically via `electronAPI.getRemoteApiToken()` when the env var is set. Browser remote clients may pass `?token=` in the URL or set `localStorage['softdmx-api-token']`.

Without a valid token (when enabled), requests should return `401 Unauthorized`.
