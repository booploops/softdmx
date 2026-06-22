# `@softdmx/wasm`

A high-performance WebAssembly module written in **Zig**, designed for computationally intensive realtime lighting tasks (such as video sampling and pixel mapping) within the SoftDMX console.

## Overview

In a realtime lighting system running at 44Hz (DMX standard), computational overhead and garbage collection in JavaScript can lead to visible fade jitter. To avoid this, `@softdmx/wasm` runs complex calculations off the main thread inside a Web Worker.

It communicates with the host application using a **Zero-Copy Memory Model** to bypass the overhead of copying large buffers between JavaScript and the WebAssembly linear heap.

---

## 📖 Complete Documentation & Guidelines

For a detailed walkthrough of when to use WebAssembly, the zero-copy memory model, Web Worker patterns, pointer caching strategies, and constraints for developer agents, please see:

👉 **[WebAssembly (WASM) Usage Guide](../../MEMORY/wasm-usage.md)**

---

## 🛠 Building the Module

The WebAssembly binary is compiled directly from [src/main.zig](file:///Volumes/Storage/Repos/GitHub/softdmx/packages/wasm/src/main.zig) to a freestanding WASM target using the Zig compiler.

### Prerequisites
Make sure you have [Zig](https://ziglang.org/) installed and available in your shell environment.

### Compile
Run the build script from the repository root:
```bash
yarn workspace @softdmx/wasm build:wasm
```
Or directly within this directory:
```bash
yarn build:wasm
```

This compiles the code into `dist/softdmx.wasm` using `-target wasm32-freestanding` and `-O ReleaseFast` optimization.
