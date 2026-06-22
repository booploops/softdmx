# Workspace Memory Index

Welcome! This folder houses memory files designed to help developer agents and human contributors quickly understand the architecture, constraints, and features of the SoftDMX codebase.

---

## Available Documentation

1. **[Engine Architecture](./engine-architecture.md)**
   * Describes the roles and boundaries of the `@softdmx/engine`, `@softdmx/frontend`, and `@softdmx/client` packages.
   * Explains the **Delegation Lookup Pattern** used to decouple fixture resolution between Node.js filesystem queries and browser-bundled environments.
   * Details structural constraints, such as keeping the engine side-effect free and compatible with browser bundling (no Node native standard library imports).

2. **[Snippets & Utilities](./snippets.md)**
   * *(Reserved)* A repository for frequently used code templates, configuration blocks, and script commands.

---

## Monorepo Architecture Quick Pointers

* **Run dev environment**: `yarn dev` from the root directory boots the entire setup (Frontend + Electron).
* **Build all packages**: `yarn build` compiles the packages sequentially under correct dependency priorities.
* **Run test suites**: `yarn test` runs tests across the workspace. All test loaders map engine imports cleanly.
