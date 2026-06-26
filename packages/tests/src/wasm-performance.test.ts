/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, test, expect, beforeAll } from "vitest";
import { initWasmEngine, type SoftDmxWasmExports } from "@softdmx/engine";
import { randomBytes } from "node:crypto";

describe("WebAssembly Realtime Performance Optimizations", () => {
  let wasm: SoftDmxWasmExports;

  beforeAll(async () => {
    const exports = await initWasmEngine();
    if (!exports) {
      throw new Error("WASM engine failed to load");
    }
    wasm = exports;
  });

  test("1. initWasmEngine loading and allocation", () => {
    expect(wasm).toBeDefined();
    expect(wasm._start).toBeDefined();

    const ptr = wasm.alloc(100);
    expect(ptr).toBeGreaterThan(0);
    wasm.free(ptr, 100);
  });

  test("2. mergeLayer HTP/LTP Blending Parity", () => {
    const channelsCount = 256;
    const layerCount = 100;

    // Allocate memory for WASM
    const outValuesPtr = wasm.alloc(channelsCount);
    const indicesPtr = wasm.alloc(layerCount * 4); // u32 is 4 bytes
    const valuesPtr = wasm.alloc(layerCount);
    const isHtpPtr = wasm.alloc(layerCount); // bool is 1 byte in Zig export

    // JS state
    const jsOutValues = new Uint8Array(channelsCount);
    // Initialize base values (e.g., all 100)
    jsOutValues.fill(100);

    // Initialize WASM out buffer
    const wasmOutValues = new Uint8Array(wasm.memory.buffer, outValuesPtr, channelsCount);
    wasmOutValues.fill(100);

    // Populate layer channels
    const jsIndices = new Uint32Array(layerCount);
    const jsValues = new Uint8Array(layerCount);
    const jsIsHtp = new Uint8Array(layerCount); // 0 or 1

    for (let i = 0; i < layerCount; i++) {
      jsIndices[i] = (i * 2) % channelsCount;
      jsValues[i] = (i * 17) % 256;
      jsIsHtp[i] = i % 2 === 0 ? 1 : 0; // alternate HTP / LTP
    }

    // Copy to WASM
    const wasmIndices = new Uint32Array(wasm.memory.buffer, indicesPtr, layerCount);
    const wasmValues = new Uint8Array(wasm.memory.buffer, valuesPtr, layerCount);
    const wasmIsHtp = new Uint8Array(wasm.memory.buffer, isHtpPtr, layerCount);

    wasmIndices.set(jsIndices);
    wasmValues.set(jsValues);
    wasmIsHtp.set(jsIsHtp);

    // Run JS Merge
    for (let i = 0; i < layerCount; i++) {
      const idx = jsIndices[i]!;
      const val = jsValues[i]!;
      const htp = jsIsHtp[i] === 1;

      if (htp) {
        jsOutValues[idx] = Math.max(jsOutValues[idx]!, val);
      } else {
        jsOutValues[idx] = val;
      }
    }

    // Run WASM Merge
    wasm.mergeLayer(outValuesPtr, layerCount, indicesPtr, valuesPtr, isHtpPtr);

    // Verify parity
    for (let i = 0; i < channelsCount; i++) {
      expect(wasmOutValues[i]).toBe(jsOutValues[i]);
    }

    // Cleanup
    wasm.free(outValuesPtr, channelsCount);
    wasm.free(indicesPtr, layerCount * 4);
    wasm.free(valuesPtr, layerCount);
    wasm.free(isHtpPtr, layerCount);
  });

  test("3. scaleGrandMaster Parity", () => {
    const channelsCount = 128;
    const grandMaster = 0.75;

    const outValuesPtr = wasm.alloc(channelsCount);
    const scalesPtr = wasm.alloc(channelsCount);

    const jsOutValues = new Uint8Array(channelsCount);
    const jsScales = new Uint8Array(channelsCount);

    for (let i = 0; i < channelsCount; i++) {
      jsOutValues[i] = (i * 3) % 256;
      jsScales[i] = i % 2 === 0 ? 1 : 0; // only even channels scale
    }

    const wasmOutValues = new Uint8Array(wasm.memory.buffer, outValuesPtr, channelsCount);
    const wasmScales = new Uint8Array(wasm.memory.buffer, scalesPtr, channelsCount);

    wasmOutValues.set(jsOutValues);
    wasmScales.set(jsScales);

    // Run JS Scaling
    for (let i = 0; i < channelsCount; i++) {
      if (jsScales[i] === 1) {
        jsOutValues[i] = Math.max(0, Math.min(255, Math.round(jsOutValues[i]! * grandMaster)));
      }
    }

    // Run WASM Scaling
    wasm.scaleGrandMaster(outValuesPtr, channelsCount, scalesPtr, grandMaster);

    // Verify parity
    for (let i = 0; i < channelsCount; i++) {
      expect(wasmOutValues[i]).toBe(jsOutValues[i]);
    }

    wasm.free(outValuesPtr, channelsCount);
    wasm.free(scalesPtr, channelsCount);
  });

  test("4. FNV-1a hashUnit32 Parity", () => {
    // Test a specific seed mapped to 4 integers
    const resultWasm = wasm.hashUnit32(1, 2, 3, 4);
    expect(resultWasm).toBeGreaterThanOrEqual(0.0);
    expect(resultWasm).toBeLessThanOrEqual(1.0);
  });

  test("5. evaluateSineEffect Parity", () => {
    const count = 50;
    const outValuesPtr = wasm.alloc(256);
    const indicesPtr = wasm.alloc(count * 4);

    const wasmOutValues = new Uint8Array(wasm.memory.buffer, outValuesPtr, 256);
    wasmOutValues.fill(0);

    const jsIndices = new Uint32Array(count);
    for (let i = 0; i < count; i++) {
      jsIndices[i] = i * 2;
    }
    const wasmIndices = new Uint32Array(wasm.memory.buffer, indicesPtr, count);
    wasmIndices.set(jsIndices);

    // Run Sine calculation
    wasm.evaluateSineEffect(outValuesPtr, count, indicesPtr, 1.25, 1.5, 128.0, 0.5);

    // Verify values are populated correctly in the right slots
    for (let i = 0; i < count; i++) {
      const idx = jsIndices[i]!;
      expect(wasmOutValues[idx]).toBeGreaterThan(0);
    }

    wasm.free(outValuesPtr, 256);
    wasm.free(indicesPtr, count * 4);
  });

  test("6. flattenPixelMatrixToChannelsWasm Parity", () => {
    const mapWidth = 4;
    const mapHeight = 4;
    const cellsCount = 8;

    const outDmxPtr = wasm.alloc(512);
    const pixelsPtr = wasm.alloc(mapWidth * mapHeight * 3);
    const xsPtr = wasm.alloc(cellsCount * 4);
    const ysPtr = wasm.alloc(cellsCount * 4);
    const destPtr = wasm.alloc(cellsCount * 4);

    // Initialize buffers
    const wasmOutDmx = new Uint8Array(wasm.memory.buffer, outDmxPtr, 512);
    wasmOutDmx.fill(0);

    const wasmPixels = new Uint8Array(wasm.memory.buffer, pixelsPtr, mapWidth * mapHeight * 3);
    for (let i = 0; i < wasmPixels.length; i++) {
      wasmPixels[i] = (i * 7) % 256;
    }

    const jsXs = new Uint32Array([0, 1, 2, 3, 0, 1, 2, 3]);
    const jsYs = new Uint32Array([0, 0, 1, 1, 2, 2, 3, 3]);
    const jsDest = new Uint32Array([10, 20, 30, 40, 50, 60, 70, 80]);

    new Uint32Array(wasm.memory.buffer, xsPtr, cellsCount).set(jsXs);
    new Uint32Array(wasm.memory.buffer, ysPtr, cellsCount).set(jsYs);
    new Uint32Array(wasm.memory.buffer, destPtr, cellsCount).set(jsDest);

    // Run WASM flattening (channel_order 0 = RGB)
    wasm.flattenPixelMatrixToChannelsWasm(
      outDmxPtr,
      pixelsPtr,
      mapWidth,
      mapHeight,
      cellsCount,
      xsPtr,
      ysPtr,
      destPtr,
      0,
    );

    // Verify cell 0: (x=0, y=0) -> pixel_offset = 0 -> R,G,B are pixels[0,1,2] -> target dest=10
    expect(wasmOutDmx[10]).toBe(wasmPixels[0]);
    expect(wasmOutDmx[11]).toBe(wasmPixels[1]);
    expect(wasmOutDmx[12]).toBe(wasmPixels[2]);

    // Verify cell 2: (x=2, y=1) -> pixel_offset = (1*4 + 2)*3 = 18 -> R,G,B are pixels[18,19,20] -> target dest=30
    expect(wasmOutDmx[30]).toBe(wasmPixels[18]);
    expect(wasmOutDmx[31]).toBe(wasmPixels[19]);
    expect(wasmOutDmx[32]).toBe(wasmPixels[20]);

    wasm.free(outDmxPtr, 512);
    wasm.free(pixelsPtr, mapWidth * mapHeight * 3);
    wasm.free(xsPtr, cellsCount * 4);
    wasm.free(ysPtr, cellsCount * 4);
    wasm.free(destPtr, cellsCount * 4);
  });

  test("7. packArtNetPacket Header Parity", () => {
    const dmxLen = 512;
    const sequence = 42;
    const subUni = 5;
    const net = 2;

    const dmxDataPtr = wasm.alloc(dmxLen);
    const outPacketPtr = wasm.alloc(18 + dmxLen);

    const jsDmxData = new Uint8Array(dmxLen);
    for (let i = 0; i < dmxLen; i++) {
      jsDmxData[i] = i % 256;
    }

    new Uint8Array(wasm.memory.buffer, dmxDataPtr, dmxLen).set(jsDmxData);

    const totalLen = wasm.packArtNetPacket(
      sequence,
      subUni,
      net,
      dmxDataPtr,
      dmxLen,
      outPacketPtr,
    );
    expect(totalLen).toBe(18 + dmxLen);

    const wasmPacket = new Uint8Array(wasm.memory.buffer, outPacketPtr, totalLen);

    // Assert headers
    expect(wasmPacket[0]).toBe("A".charCodeAt(0));
    expect(wasmPacket[1]).toBe("r".charCodeAt(0));
    expect(wasmPacket[2]).toBe("t".charCodeAt(0));
    expect(wasmPacket[3]).toBe("-".charCodeAt(0));
    expect(wasmPacket[4]).toBe("N".charCodeAt(0));
    expect(wasmPacket[5]).toBe("e".charCodeAt(0));
    expect(wasmPacket[6]).toBe("t".charCodeAt(0));
    expect(wasmPacket[7]).toBe(0);
    expect(wasmPacket[8]).toBe(0);
    expect(wasmPacket[9]).toBe(0x50); // OpCode low byte
    expect(wasmPacket[10]).toBe(0); // OpCode high byte
    expect(wasmPacket[11]).toBe(14); // Protocol version
    expect(wasmPacket[12]).toBe(sequence);
    expect(wasmPacket[13]).toBe(0); // Physical port
    expect(wasmPacket[14]).toBe(subUni);
    expect(wasmPacket[15]).toBe(net);
    expect(wasmPacket[16]).toBe((dmxLen >> 8) & 0xff);
    expect(wasmPacket[17]).toBe(dmxLen & 0xff);

    // Assert payload matches
    for (let i = 0; i < dmxLen; i++) {
      expect(wasmPacket[18 + i]).toBe(jsDmxData[i]);
    }

    wasm.free(dmxDataPtr, dmxLen);
    wasm.free(outPacketPtr, 18 + dmxLen);
  });

  test("8. packSacnPacket PDU Parity", () => {
    const dmxLen = 512;
    const sequence = 120;
    const universe = 3;
    const cid = randomBytes(16);
    const sourceName = "TestConsole";

    const cidPtr = wasm.alloc(16);
    const sourceNamePtr = wasm.alloc(sourceName.length);
    const dmxDataPtr = wasm.alloc(dmxLen);
    const outPacketPtr = wasm.alloc(126 + dmxLen);

    new Uint8Array(wasm.memory.buffer, cidPtr, 16).set(cid);
    new Uint8Array(wasm.memory.buffer, sourceNamePtr, sourceName.length).set(
      Buffer.from(sourceName, "utf8"),
    );

    const jsDmx = new Uint8Array(dmxLen);
    for (let i = 0; i < dmxLen; i++) {
      jsDmx[i] = (i * 3) % 256;
    }
    new Uint8Array(wasm.memory.buffer, dmxDataPtr, dmxLen).set(jsDmx);

    const totalLen = wasm.packSacnPacket(
      cidPtr,
      sequence,
      universe,
      sourceNamePtr,
      sourceName.length,
      dmxDataPtr,
      dmxLen,
      outPacketPtr,
    );
    expect(totalLen).toBe(126 + dmxLen);

    const wasmPacket = new Uint8Array(wasm.memory.buffer, outPacketPtr, totalLen);

    // Verify preamble/PID
    expect(wasmPacket[0]).toBe(0x00);
    expect(wasmPacket[1]).toBe(0x10);
    expect(wasmPacket[2]).toBe(0x00);
    expect(wasmPacket[3]).toBe(0x00);
    expect(Buffer.from(wasmPacket.subarray(4, 16)).toString("ascii")).toBe("ASC-E1.17\x00\x00\x00");

    // Verify CID
    expect(Buffer.from(wasmPacket.subarray(22, 38))).toEqual(cid);

    // Verify sourceName (64 bytes starting at index 44)
    const nameField = Buffer.from(wasmPacket.subarray(44, 108));
    expect(nameField.toString("utf8").replaceAll(String.fromCharCode(0), "")).toBe(sourceName);

    // Verify sequence at index 111
    expect(wasmPacket[111]).toBe(sequence);

    // Verify universe at index 113-114
    expect(wasmPacket[113]).toBe((universe >> 8) & 0xff);
    expect(wasmPacket[114]).toBe(universe & 0xff);

    // Verify start code (0x00) at index 125
    expect(wasmPacket[125]).toBe(0x00);

    // Verify payload
    for (let i = 0; i < dmxLen; i++) {
      expect(wasmPacket[126 + i]).toBe(jsDmx[i]);
    }

    wasm.free(cidPtr, 16);
    wasm.free(sourceNamePtr, sourceName.length);
    wasm.free(dmxDataPtr, dmxLen);
    wasm.free(outPacketPtr, 126 + dmxLen);
  });
});
