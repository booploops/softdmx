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
   * Sequentially merges layer values into a flat DMX channel buffer (HTP/LTP).
   */
  mergeLayer(
    out_values: number,
    layer_count: number,
    indices: number,
    values: number,
    is_htp: number,
  ): void;

  /**
   * Applies f32 GrandMaster scaling directly onto a flat channel buffer.
   */
  scaleGrandMaster(
    out_values: number,
    channels_count: number,
    scales_with_gm: number,
    grand_master: number,
  ): void;

  /**
   * High-speed 32-bit FNV-1a hashing function.
   */
  hashUnit32(seed1: number, seed2: number, seed3: number, seed4: number): number;

  /**
   * Vectorized calculation of sine effect LFO.
   */
  evaluateSineEffect(
    out_values: number,
    count: number,
    indices: number,
    phase: number,
    rate: number,
    offset: number,
    depth: number,
  ): void;

  /**
   * Vectorized calculation of phaser effect LFO.
   */
  evaluatePhaserEffect(
    out_values: number,
    count: number,
    indices: number,
    fixture_indices: number,
    phase: number,
    rate: number,
    offset: number,
    depth: number,
    phase_spread: number,
    wings: number,
    waveform: number,
    spread_mode: number,
  ): void;

  /**
   * Maps 2D RGB buffers into a flat DMX channel buffer using configurable pixel orders (RGB, GRB, etc.) and indices.
   */
  flattenPixelMatrixToChannelsWasm(
    out_dmx_values: number,
    pixels_rgb: number,
    map_width: number,
    map_height: number,
    cells_count: number,
    cell_xs: number,
    cell_ys: number,
    cell_dest_indices: number,
    channel_order: number,
  ): void;

  /**
   * Construct raw Art-Net packet headers directly in-place.
   */
  packArtNetPacket(
    sequence: number,
    sub_uni: number,
    net: number,
    dmx_data: number,
    dmx_len: number,
    out_packet: number,
  ): number;

  /**
   * Construct sACN root, framing, and DMP layer packets in-place.
   */
  packSacnPacket(
    cid: number,
    sequence: number,
    universe: number,
    source_name: number,
    source_name_len: number,
    dmx_data: number,
    dmx_len: number,
    out_packet: number,
  ): number;

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
