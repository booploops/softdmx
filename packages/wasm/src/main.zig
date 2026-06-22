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
