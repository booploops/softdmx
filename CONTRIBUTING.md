# Contributing to SoftDMX

Thank you for your interest in contributing to **SoftDMX**! We appreciate your help in building a modern, approachable software lighting controller.

To ensure a smooth collaboration process, please read and follow these guidelines.

---

## 🏗️ Monorepo Structure

SoftDMX is organized as a Yarn v4 monorepo with workspaces:

- **`packages/frontend`**: The desktop/touch user interface built with **Vue 3**, **Quasar**, **Pinia**, and **Vite**.
- **`packages/client`**: The **Electron** shell, local web server (**Fastify**), native integrations, and DMX engine.
- **`docs/`**: Technical documentation detailing the system architecture, schemas, and APIs.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**
- **Yarn**

### Local Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/booploops/softdmx.git
    cd softdmx
    ```
2.  Enable Corepack and install dependencies:
    ```bash
    corepack enable
    yarn install
    ```

### Development Commands

Always run these commands from the **root** of the monorepo:

| Command             | Action                                                                   |
| :------------------ | :----------------------------------------------------------------------- |
| `yarn dev`          | Start both Vite frontend & Electron client simultaneously (hot-reloaded) |
| `yarn dev:frontend` | Start only the Vue/Quasar web server                                     |
| `yarn dev:electron` | Start only the Electron application shell                                |
| `yarn build`        | Compile both frontend and Electron assets for production                 |
| `yarn cli --help`   | Invoke the local softdmx CLI                                             |

---

## 🧪 Testing

We use the built-in Node.js test runner with experimental strip types. Tests are run via root npm/yarn scripts:

| Script                  | Purpose                                                        |
| :---------------------- | :------------------------------------------------------------- |
| `yarn test`             | Run the complete test suite                                    |
| `yarn test:unit`        | Focus on unit tests                                            |
| `yarn test:property`    | Run fast-check property-based tests                            |
| `yarn test:integration` | Run REST & Socket.IO API tests against an in-process server    |
| `yarn test:e2e`         | Run headless smoke tests                                       |
| `yarn test:playwright`  | Run Playwright browser/UI tests                                |
| `yarn test:coverage`    | Run tests with V8 coverage generation (outputs to `coverage/`) |

To run a specific test file:

```bash
yarn test:unit test/show-io.test.ts
```

For more info, read the [Testing Documentation](docs/testing.md).

---

## 📝 Guidelines & Best Practices

### Code Style

- **TypeScript**: Write strictly-typed TypeScript across both frontend and client packages.
- **Imports**: Use alias imports where configured (e.g., `src/` alias in client and frontend).
- **Formatting**: Follow the project's `.editorconfig` rules (use 2 spaces for indentation).

### Pull Request (PR) Workflow

1.  **Branch**: Create a feature branch from `main` (e.g., `feature/approach-cues`).
2.  **Test**: Ensure all unit, property, and integration tests pass locally before committing.
3.  **Commit**: Keep commit messages concise, descriptive, and imperative (e.g., `feat: add Art-Net output node support`).
4.  **Submit**: Open a PR against the `main` branch. Provide a brief description of what the PR accomplishes and reference any linked issues.

---

## ⚖️ License Compliance (MPL 2.0)

SoftDMX is licensed under the [Mozilla Public License 2.0](LICENSE). By contributing, you agree that your contributions will be licensed under the MPL 2.0.

To properly adhere to the license:

### 1. File Headers
All new source files (TypeScript, JavaScript, etc.) must include the standard MPL 2.0 boilerplate header at the very top of the file:

```typescript
/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
```

### 2. Modifying Existing Files
The MPL 2.0 is a file-level copyleft license. This means:
*   Any modifications you make to an existing file in this repository remain governed by the MPL 2.0.
*   You must not remove existing copyright notices or license headers from any files you modify.

### 3. Third-Party Dependencies
If your contribution introduces new external dependencies:
*   Ensure they use a compatible open-source license (such as MIT, BSD, Apache 2.0, or MPL 2.0).
*   Avoid adding dependencies licensed under strict copyleft licenses (e.g., GPL/AGPL) unless discussed and approved beforehand.

