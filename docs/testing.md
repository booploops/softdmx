# Testing

Tests use **Vitest** in the `@softdmx/tests` workspace (`packages/tests`). Root `yarn test*` scripts forward to that package.

## Commands

| Command | Scope |
|---------|-------|
| `yarn test` | Unit, property, integration, and headless e2e (Vitest) |
| `yarn test:unit` | Unit / helper / fixture / fuzz harness tests |
| `yarn test:property` | fast-check property tests |
| `yarn test:integration` | REST + Socket.IO against in-process Hono server |
| `yarn test:e2e` | Headless smoke under `packages/tests/src/e2e/` |
| `yarn test:fuzz` | Jazzer parser fuzzing |
| `yarn test:playwright` | Playwright browser/UI tests |
| `yarn test:coverage` | Full suite with V8 coverage → `coverage/` |

Watch mode (package-local; not aliased at the monorepo root):

```bash
yarn workspace @softdmx/tests test:watch
```

Run one file:

```bash
yarn test:unit src/show-io.test.ts
```

## Where tests live

All under `packages/tests/src/`:

- `*.test.ts` — unit tests at package root
- `unit/` — focused unit tests
- `property/` — fast-check
- `integration/` — server and multi-module tests
- `fixtures/shows/` — golden show YAML per schema version
- `fuzz/` — Jazzer harnesses and seed corpus
- `e2e/` — headless and Playwright specs

Helpers: `packages/tests/src/helpers/show-builders.ts`, `server-harness.ts`, path-resolution hooks.

Vitest maps legacy `packages/frontend/src/engine/*` and `.../show/*` imports to `@softdmx/engine`. See `packages/tests/vitest.config.ts` and [MEMORY/testing.md](../MEMORY/testing.md).

## Golden show fixtures

`packages/tests/src/fixtures/shows/golden-{version}.yml` covers versions `1.0`–`1.6`. `golden-roundtrip.test.ts` asserts each migrates to the current version (`1.6`).

When bumping the schema: add a migration in `packages/engine/src/show/migrate.ts`, add a golden file, extend `GOLDEN_VERSIONS` in the roundtrip test.

## Fuzzing

Harnesses in `packages/tests/src/fuzz/harnesses/` target show YAML, fixture YAML, and OSC address parsing. Seeds live in `packages/tests/src/fuzz/corpus/`. Commit any input that found a bug.

Runs on push via `.github/workflows/fuzz.yml`.

## CI

- `ci.yml` — tests, coverage artifact, SPA build, Electron build
- `security.yml` — OSV-Scanner and CodeQL (also weekly)
- `fuzz.yml` — fuzz harnesses on push
