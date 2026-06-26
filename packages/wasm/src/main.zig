///
/// Copyright (C) 2025-Present booploops and contributors
///
/// This Source Code Form is subject to the terms of the Mozilla Public
/// License, v. 2.0. If a copy of the MPL was not distributed with this
/// file, You can obtain one at https://mozilla.org/MPL/2.0/.
///
const std = @import("std");

var allocator = std.heap.page_allocator;

export fn _start() void {}

export fn alloc(size: usize) ?[*]u8 {
    const buf = allocator.alloc(u8, size) catch return null;
    return buf.ptr;
}

export fn free(ptr: ?[*]u8, size: usize) void {
    if (ptr) |p| {
        allocator.free(p[0..size]);
    }
}

export fn sampleFrameToPixelGrid(
    frame_width: u32,
    frame_height: u32,
    frame_data: [*]const u8,
    map_width: u32,
    map_height: u32,
    region_x: f32,
    region_y: f32,
    region_width: f32,
    region_height: f32,
    flip_y: bool,
    out_rgb: [*]u8,
) void {
    var py: u32 = 0;
    while (py < map_height) : (py += 1) {
        var px: u32 = 0;
        while (px < map_width) : (px += 1) {
            const u = region_x + ((@as(f32, @floatFromInt(px)) + 0.5) / @as(f32, @floatFromInt(map_width))) * region_width;
            const v = region_y + ((@as(f32, @floatFromInt(py)) + 0.5) / @as(f32, @floatFromInt(map_height))) * region_height;

            const src_x_float = @floor(u * @as(f32, @floatFromInt(frame_width)));
            const src_y_raw_float = @floor(v * @as(f32, @floatFromInt(frame_height)));

            var src_x = @as(i32, @intFromFloat(src_x_float));
            if (src_x < 0) {
                src_x = 0;
            } else if (src_x >= @as(i32, @intCast(frame_width))) {
                src_x = @as(i32, @intCast(frame_width)) - 1;
            }

            var src_y_raw = @as(i32, @intFromFloat(src_y_raw_float));
            if (src_y_raw < 0) {
                src_y_raw = 0;
            } else if (src_y_raw >= @as(i32, @intCast(frame_height))) {
                src_y_raw = @as(i32, @intCast(frame_height)) - 1;
            }

            const src_y: u32 = if (flip_y)
                frame_height - 1 - @as(u32, @intCast(src_y_raw))
            else
                @as(u32, @intCast(src_y_raw));

            const offset = (src_y * frame_width + @as(u32, @intCast(src_x))) * 4;
            const out_offset = (py * map_width + px) * 3;

            out_rgb[out_offset] = frame_data[offset];
            out_rgb[out_offset + 1] = frame_data[offset + 1];
            out_rgb[out_offset + 2] = frame_data[offset + 2];
        }
    }
}

export fn mergeLayer(
    out_values: [*]u8,
    layer_count: u32,
    indices: [*]const u32,
    values: [*]const u8,
    is_htp: [*]const bool,
) void {
    var i: u32 = 0;
    while (i < layer_count) : (i += 1) {
        const dest_idx = indices[i];
        const val = values[i];
        if (is_htp[i]) {
            out_values[dest_idx] = @max(out_values[dest_idx], val);
        } else {
            out_values[dest_idx] = val;
        }
    }
}

export fn scaleGrandMaster(
    out_values: [*]u8,
    channels_count: u32,
    scales_with_gm: [*]const bool,
    grand_master: f32,
) void {
    var i: u32 = 0;
    while (i < channels_count) : (i += 1) {
        if (scales_with_gm[i]) {
            const val = @as(f32, @floatFromInt(out_values[i])) * grand_master;
            const clamped = @round(val);
            if (clamped < 0.0) {
                out_values[i] = 0;
            } else if (clamped > 255.0) {
                out_values[i] = 255;
            } else {
                out_values[i] = @as(u8, @intFromFloat(clamped));
            }
        }
    }
}

export fn hashUnit32(seed1: u32, seed2: u32, seed3: u32, seed4: u32) f32 {
    var hash: u32 = 2166136261;
    hash = (hash ^ seed1) *% 16777619;
    hash = (hash ^ seed2) *% 16777619;
    hash = (hash ^ seed3) *% 16777619;
    hash = (hash ^ seed4) *% 16777619;
    return @as(f32, @floatFromInt(hash)) / 4294967295.0;
}

export fn evaluateSineEffect(
    out_values: [*]u8,
    count: u32,
    indices: [*]const u32,
    phase: f32,
    rate: f32,
    offset: f32,
    depth: f32,
) void {
    const raw_phase = phase * rate;
    const normalized_phase = @mod(raw_phase, 1.0);
    const final_phase = if (normalized_phase < 0.0) normalized_phase + 1.0 else normalized_phase;
    const theta = final_phase * 2.0 * std.math.pi;
    const sin_val = @sin(theta);
    const normalized = (sin_val + 1.0) / 2.0;
    const lfo = @round(normalized * 255.0);

    const lfo_centered = lfo - 128.0;
    const base_val = offset + lfo_centered * depth;
    const final_val = @round(base_val);

    var u8_val: u8 = 0;
    if (final_val >= 255.0) {
        u8_val = 255;
    } else if (final_val > 0.0) {
        u8_val = @as(u8, @intFromFloat(final_val));
    }

    var i: u32 = 0;
    while (i < count) : (i += 1) {
        out_values[indices[i]] = u8_val;
    }
}

fn waveformValue(waveform: u32, phase: f32) f32 {
    const raw_t = @mod(phase, 1.0);
    const t = if (raw_t < 0.0) raw_t + 1.0 else raw_t;
    switch (waveform) {
        1 => { // triangle
            return if (t < 0.5) t * 2.0 else 2.0 - t * 2.0;
        },
        2 => { // square
            return if (t < 0.5) 1.0 else 0.0;
        },
        else => { // sine
            return (@sin(t * std.math.pi * 2.0) + 1.0) / 2.0;
        }
    }
}

export fn evaluatePhaserEffect(
    out_values: [*]u8,
    count: u32,
    indices: [*]const u32,
    fixture_indices: [*]const u32,
    phase: f32,
    rate: f32,
    offset: f32,
    depth: f32,
    phase_spread: f32,
    wings: u32,
    waveform: u32, // 0: sine, 1: triangle, 2: square
    spread_mode: u32, // 0: linear, 1: random, 2: reverse
) void {
    const safe_spread = if (phase_spread < 0.0) 0.0 else phase_spread;
    const f_count_minus_1 = if (count <= 1) 1.0 else @as(f32, @floatFromInt(count - 1));

    var i: u32 = 0;
    while (i < count) : (i += 1) {
        const fixture_idx = fixture_indices[i];
        const normalized_index = if (count <= 1) 0.0 else @as(f32, @floatFromInt(i)) / f_count_minus_1;

        var spread_phase = normalized_index * safe_spread;
        if (wings > 0 and count > 1) {
            const wings_f = @as(f32, @floatFromInt(wings));
            const wing_size = @as(u32, @intFromFloat(@ceil(@as(f32, @floatFromInt(count)) / wings_f)));
            const wing_index = i / wing_size;
            const within_wing = i % wing_size;
            const wing_span = if (wing_size <= 1) 1.0 else @as(f32, @floatFromInt(wing_size - 1));
            const wing_direction: f32 = if (wing_index % 2 == 0) 1.0 else -1.0;
            spread_phase = (@as(f32, @floatFromInt(within_wing)) / wing_span) * safe_spread * wing_direction;
        }

        if (spread_mode == 1) { // random
            const seed3_val = @as(u32, @intFromFloat(safe_spread * 1000.0));
            const hash_val = hashUnit32(fixture_idx, count, seed3_val, 42);
            spread_phase = hash_val * safe_spread;
        } else if (spread_mode == 2) { // reverse
            spread_phase = safe_spread - spread_phase;
        }

        const lfo_01 = waveformValue(waveform, phase * rate + spread_phase);
        const lfo = lfo_01 * 255.0;
        const lfo_centered = lfo - 128.0;
        const base_val = offset + lfo_centered * (depth / 255.0);
        const final_val = @round(base_val);

        var u8_val: u8 = 0;
        if (final_val >= 255.0) {
            u8_val = 255;
        } else if (final_val > 0.0) {
            u8_val = @as(u8, @intFromFloat(final_val));
        }

        out_values[indices[i]] = u8_val;
    }
}

export fn flattenPixelMatrixToChannelsWasm(
    out_dmx_values: [*]u8,
    pixels_rgb: [*]const u8,
    map_width: u32,
    map_height: u32,
    cells_count: u32,
    cell_xs: [*]const u32,
    cell_ys: [*]const u32,
    cell_dest_indices: [*]const u32,
    channel_order: u32, // 0: rgb, 1: rbg, 2: grb, 3: gbr, 4: brg, 5: bgr
) void {
    var i: u32 = 0;
    while (i < cells_count) : (i += 1) {
        const cx = cell_xs[i];
        const cy = cell_ys[i];
        if (cx >= map_width or cy >= map_height) continue;

        const pixel_offset = (cy * map_width + cx) * 3;
        const r = pixels_rgb[pixel_offset];
        const g = pixels_rgb[pixel_offset + 1];
        const b = pixels_rgb[pixel_offset + 2];

        const dest_offset = cell_dest_indices[i];

        switch (channel_order) {
            0 => { // rgb
                out_dmx_values[dest_offset] = r;
                out_dmx_values[dest_offset + 1] = g;
                out_dmx_values[dest_offset + 2] = b;
            },
            1 => { // rbg
                out_dmx_values[dest_offset] = r;
                out_dmx_values[dest_offset + 1] = b;
                out_dmx_values[dest_offset + 2] = g;
            },
            2 => { // grb
                out_dmx_values[dest_offset] = g;
                out_dmx_values[dest_offset + 1] = r;
                out_dmx_values[dest_offset + 2] = b;
            },
            3 => { // gbr
                out_dmx_values[dest_offset] = g;
                out_dmx_values[dest_offset + 1] = b;
                out_dmx_values[dest_offset + 2] = r;
            },
            4 => { // brg
                out_dmx_values[dest_offset] = b;
                out_dmx_values[dest_offset + 1] = r;
                out_dmx_values[dest_offset + 2] = g;
            },
            5 => { // bgr
                out_dmx_values[dest_offset] = b;
                out_dmx_values[dest_offset + 1] = g;
                out_dmx_values[dest_offset + 2] = r;
            },
            else => {
                out_dmx_values[dest_offset] = r;
                out_dmx_values[dest_offset + 1] = g;
                out_dmx_values[dest_offset + 2] = b;
            }
        }
    }
}

export fn packArtNetPacket(
    sequence: u8,
    sub_uni: u8,
    net: u8,
    dmx_data: [*]const u8,
    dmx_len: u16,
    out_packet: [*]u8,
) u32 {
    out_packet[0] = 'A';
    out_packet[1] = 'r';
    out_packet[2] = 't';
    out_packet[3] = '-';
    out_packet[4] = 'N';
    out_packet[5] = 'e';
    out_packet[6] = 't';
    out_packet[7] = 0;
    out_packet[8] = 0;
    out_packet[9] = 0x50; // OpCode: ArtDmx (0x5000, transmitted low byte first)
    out_packet[10] = 0;
    out_packet[11] = 14; // Protocol version 14
    out_packet[12] = sequence;
    out_packet[13] = 0; // Physical port
    out_packet[14] = sub_uni;
    out_packet[15] = net;
    out_packet[16] = @as(u8, @intCast((dmx_len >> 8) & 0xff)); // Length high byte
    out_packet[17] = @as(u8, @intCast(dmx_len & 0xff)); // Length low byte

    var i: u16 = 0;
    while (i < dmx_len) : (i += 1) {
        out_packet[18 + i] = dmx_data[i];
    }

    return 18 + @as(u32, dmx_len);
}

export fn packSacnPacket(
    cid: [*]const u8, // 16 bytes
    sequence: u8,
    universe: u16,
    source_name: [*]const u8, // up to 64 bytes
    source_name_len: u32,
    dmx_data: [*]const u8,
    dmx_len: u16,
    out_packet: [*]u8,
) u32 {
    const propertyValueCount = dmx_len + 1; // 513 if 512
    const dmpPduLength = 10 + propertyValueCount; // 523
    const framingPduLength = 77 + dmpPduLength; // 600
    const rootPduLength = 22 + framingPduLength; // 622

    // Preamble + post-amble
    out_packet[0] = 0x00;
    out_packet[1] = 0x10;
    out_packet[2] = 0x00;
    out_packet[3] = 0x00;

    // ACN_PID: "ASC-E1.17\0\0\0"
    const acn_pid = "ASC-E1.17\x00\x00\x00";
    var idx: u32 = 0;
    while (idx < 12) : (idx += 1) {
        out_packet[4 + idx] = acn_pid[idx];
    }

    // Root Layer PDU
    out_packet[16] = 0x70 | @as(u8, @intCast((rootPduLength >> 8) & 0x0f));
    out_packet[17] = @as(u8, @intCast(rootPduLength & 0xff));
    // Vector
    out_packet[18] = 0x00;
    out_packet[19] = 0x00;
    out_packet[20] = 0x00;
    out_packet[21] = 0x04;
    // CID
    idx = 0;
    while (idx < 16) : (idx += 1) {
        out_packet[22 + idx] = cid[idx];
    }

    // Framing Layer PDU
    out_packet[38] = 0x70 | @as(u8, @intCast((framingPduLength >> 8) & 0x0f));
    out_packet[39] = @as(u8, @intCast(framingPduLength & 0xff));
    // Vector
    out_packet[40] = 0x00;
    out_packet[41] = 0x00;
    out_packet[42] = 0x00;
    out_packet[43] = 0x02;
    // Source Name
    idx = 0;
    while (idx < 64) : (idx += 1) {
        if (idx < source_name_len) {
            out_packet[44 + idx] = source_name[idx];
        } else {
            out_packet[44 + idx] = 0;
        }
    }
    // Priority
    out_packet[108] = 100;
    // Sync address
    out_packet[109] = 0x00;
    out_packet[110] = 0x00;
    // Sequence
    out_packet[111] = sequence;
    // Options
    out_packet[112] = 0x00;
    // Universe
    out_packet[113] = @as(u8, @intCast((universe >> 8) & 0xff));
    out_packet[114] = @as(u8, @intCast(universe & 0xff));

    // DMP Layer PDU
    out_packet[115] = 0x70 | @as(u8, @intCast((dmpPduLength >> 8) & 0x0f));
    out_packet[116] = @as(u8, @intCast(dmpPduLength & 0xff));
    // Vector
    out_packet[117] = 0x02;
    // Address & data type
    out_packet[118] = 0xa1;
    // First property address
    out_packet[119] = 0x00;
    out_packet[120] = 0x00;
    // Address increment
    out_packet[121] = 0x00;
    out_packet[122] = 0x01;
    // Property value count
    out_packet[123] = @as(u8, @intCast((propertyValueCount >> 8) & 0xff));
    out_packet[124] = @as(u8, @intCast(propertyValueCount & 0xff));

    // Start code followed by DMX values
    out_packet[125] = 0x00;
    idx = 0;
    while (idx < dmx_len) : (idx += 1) {
        out_packet[126 + idx] = dmx_data[idx];
    }

    return 16 + 22 + 77 + 10 + @as(u32, propertyValueCount);
}
