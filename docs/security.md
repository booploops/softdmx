# Security Notes

## Electron production CSP (important)

SoftDMX currently serves its UI from an internal local HTTP server in Electron production.
Because there is no explicit Content Security Policy configured yet, treat CSP hardening as a release-gate item for production builds.

Recommended baseline CSP for production UI pages:

- `default-src 'self'`
- `script-src 'self'`
- `style-src 'self' 'unsafe-inline'`
- `img-src 'self' data: blob:`
- `connect-src 'self' ws: wss: http://127.0.0.1:5353`
- `font-src 'self' data:`
- `object-src 'none'`
- `base-uri 'self'`
- `frame-ancestors 'none'`

If external APIs or CDNs are added later, explicitly extend only the required directives.

## Remote API auth

For REST routes under `/api/v1/remote`, set `SOFTDMX_API_TOKEN` to require token auth.
Clients can send this token using:

- `Authorization: Bearer <token>`, or
- `x-api-token: <token>`

Without a valid token (when enabled), requests should return `401 Unauthorized`.
