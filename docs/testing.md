# Testing

Tests use the Node.js built-in runner with `--experimental-strip-types`. Electron main-process imports need the `src/` alias loader:

```bash
node --import ./test/helpers/register-src-alias.mjs --experimental-strip-types --test <file>
```

All `yarn test*` scripts include that import.

## Commands

| Command | Scope |
|---------|-------|
| `yarn test` | Everything |
| `yarn test:unit` | Unit tests |
| `yarn test:property` | fast-check property tests |
| `yarn test:integration` | REST + Socket.IO against in-process server |
| `yarn test:e2e` | Headless smoke (`test/e2e/headless/`) |
| `yarn test:fuzz` | Jazzer parser fuzzing |
| `yarn test:coverage` | Full suite with V8 coverage → `coverage/` |

Run one file:

```bash
yarn test:unit test/show-io.test.ts
```

## Where tests live

- `test/*.test.ts` — existing unit tests (root is fine)
- `test/unit/` — new focused unit tests
- `test/property/` — fast-check
- `test/integration/` — server and multi-module tests
- `test/fixtures/shows/` — golden show YAML per schema version
- `test/fuzz/` — Jazzer harnesses and seed corpus
- `test/e2e/` — headless and Playwright specs

Helpers: `test/helpers/show-builders.ts`, `test/helpers/server-harness.ts`.

## Golden show fixtures

`test/fixtures/shows/golden-{version}.yml` covers versions `1.0`–`1.5`. `golden-roundtrip.test.ts` asserts each migrates to the current version.

When bumping the schema: add a migration in `src/show/migrate.ts`, add a golden file, extend `GOLDEN_VERSIONS` in the roundtrip test.

## Fuzzing

Harnesses in `test/fuzz/harnesses/` target show YAML, fixture YAML, and OSC address parsing. Seeds live in `test/fuzz/corpus/`. Commit any input that found a bug.

Runs on push via `.github/workflows/fuzz.yml`.

## CI

- `ci.yml` — tests, coverage artifact, SPA build, Electron build
- `security.yml` — OSV-Scanner and CodeQL (also weekly)
- `fuzz.yml` — fuzz harnesses on push
