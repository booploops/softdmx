/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Type definitions representing the exports of the compiled softdmx WASM module.
 */
export interface SoftDmxWasmExports extends WebAssembly.Exports {
  /**
   * Special startup function for the freestanding WASM module.
   */
  _start(): void;

  /**
   * Allocates a buffer of the specified size in the WASM linear memory.
   * 
   * @param size The size of the buffer to allocate in bytes.
   * @returns A pointer (offset) to the allocated buffer in the WASM memory, or 0 if allocation fails.
   */
  alloc(size: number): number;

  /**
   * Deallocates a previously allocated buffer in the WASM linear memory.
   * 
   * @param ptr The pointer (offset) to the buffer to free.
   * @param size The size of the buffer in bytes.
   */
  free(ptr: number, size: number): void;

  /**
   * Samples a region of a video frame and maps it to a pixel grid (map), storing the resulting
   * RGB values back into the WASM memory buffer.
   * 
   * @param frame_width Width of the source video frame.
   * @param frame_height Height of the source video frame.
   * @param frame_data Pointer to the source frame RGBA/RGBA data in WASM memory.
   * @param map_width Width of the target output grid.
   * @param map_height Height of the target output grid.
   * @param region_x Normalised X-coordinate of the sampling region's top-left corner (0.0 to 1.0).
   * @param region_y Normalised Y-coordinate of the sampling region's top-left corner (0.0 to 1.0).
   * @param region_width Normalised width of the sampling region (0.0 to 1.0).
   * @param region_height Normalised height of the sampling region (0.0 to 1.0).
   * @param flip_y True if the Y-axis of the source frame should be inverted when sampling.
   * @param out_rgb Pointer to the destination RGB output buffer in WASM memory.
   */
  sampleFrameToPixelGrid(
    frame_width: number,
    frame_height: number,
    frame_data: number,
    map_width: number,
    map_height: number,
    region_x: number,
    region_y: number,
    region_width: number,
    region_height: number,
    flip_y: boolean,
    out_rgb: number,
  ): void;

  /**
   * The underlying WebAssembly memory instance.
   */
  readonly memory: WebAssembly.Memory;
}

/**
 * A type representing the loaded WebAssembly instance for softdmx.
 */
export interface SoftDmxWasmInstance extends WebAssembly.Instance {
  readonly exports: SoftDmxWasmExports;
}
