# Testing & Contribution Guide

This document outlines how the testing suite is structured in SoftDMX, how to run tests, and how to add new tests correctly.

---

## 1. Directory Structure

All testing infrastructure is centralized under a single package, **`packages/tests`** (`@softdmx/tests`).

```
packages/tests/
├── package.json               # Test package dependencies (fastify, fast-check, etc.)
├── tsconfig.json              # TypeScript configuration for tests
└── src/
    ├── helpers/               # Test utilities, servers, and ESM resolution hooks
    │   ├── register-src-alias.mjs
    │   ├── resolve-src-hook.mjs
    │   └── server-harness.ts
    ├── fixtures/              # Mock fixtures and show documents
    ├── fuzz/                  # Fuzz testing harnesses (using @jazzer.js/core)
    ├── integration/           # Integration tests for server REST/Socket endpoints
    ├── property/              # Property-based tests (using fast-check)
    ├── e2e/                   # Playwright E2E electron launch/interaction tests
    └── *.test.ts              # Unit tests for core engine & frontend modules
```

---

## 2. Command Reference

All test scripts are defined in `@softdmx/tests` but are aliased as top-level workspace commands in the root `package.json`.

| Script | Description |
| :--- | :--- |
| `yarn test` | Runs all unit and E2E Node-native tests. |
| `yarn test:unit` | Runs all unit, helper, fuzz, and fixture tests. |
| `yarn test:property` | Runs property-based roundtrip and invariant tests. |
| `yarn test:integration` | Runs API endpoint and Socket.IO mock server tests. |
| `yarn test:e2e` | Runs standalone Node test harness smoke tests. |
| `yarn test:playwright` | Runs Playwright Chromium E2E/Electron tests. |
| `yarn test:coverage` | Computes test coverage using Node V8 native coverage. |

---

## 3. Architecture & Path Resolution

SoftDMX tests run in a pure **Node.js** native test runner (`node --test`) with `--experimental-strip-types`. 

### The Custom ESM Loader Hook
Because tests live in a different workspace (`packages/tests`) than the source code (`packages/frontend/src`, `packages/engine/src`), we use a custom Node ESM Loader Hook to resolve and map paths:

* **Location**: `packages/tests/src/helpers/resolve-src-hook.mjs`
* **Registration**: Preloaded via `--import src/helpers/register-src-alias.mjs` in all test scripts.
* **How it works**: 
  - Resolves any imports targeting `@softdmx/engine` directly to raw source files under `packages/engine/src/index.ts`.
  - Intercepts paths starting with `packages/frontend/src/engine/` and redirects them to the decoupled core folder: `packages/engine/src/core/`.
  - Intercepts paths starting with `packages/frontend/src/show/` and redirects them to `packages/engine/src/show/`.

---

## 4. How to Contribute & Add Tests

When contributing new features, follow these guidelines to keep the test suite running smoothly:

### A. Relative Imports in Tests
Because the tests are inside the `@softdmx/tests` package but import from `@softdmx/frontend`, relative imports must point back to `frontend/src`:
- For files at the **root of `src/`** (e.g., `src/audio-mapping.test.ts`), import using:
  ```typescript
  import { createEmptyShow } from '../../frontend/src/show/document.ts';
  ```
- For nested files in a **subdirectory of `src/`** (e.g., `src/unit/fixture-yaml.test.ts`), import using:
  ```typescript
  import { loadFixtureYaml } from '../../../frontend/src/fixture-library/fixture-yaml.ts';
  ```

### B. Adding Test Files
- **Unit Tests**: Place in `src/` (or `src/unit/` for file loader/registry tests) ending in `.test.ts`.
- **Property Tests**: Place in `src/property/` ending in `.test.ts`.
- **Integration Tests**: Place in `src/integration/` ending in `.test.ts`.
- **E2E/Playwright**: Place in `src/e2e/` (or update Electron launches under `src/e2e/electron`) ending in `.spec.ts` or `.mjs`.

### C. Assertions
Use the standard Node.js strict assertion library:
```typescript
import assert from 'node:assert/strict';

assert.equal(actual, expected);
assert.deepEqual(actualObject, expectedObject);
```
