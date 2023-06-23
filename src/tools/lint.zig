const std = @import("std");

const fs = std.fs;
const Allocator = std.mem.Allocator;

const PATH = "src";
const LINE_LENGTH = 100;

pub fn main() !void {
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();
    const allocator = arena.allocator();

    const build = try checkBuild(allocator);
    const format = try checkFormat(PATH, allocator);
    const lint = try lintDir(PATH, fs.cwd(), PATH, allocator);
    std.process.exit(@intFromBool(build or format or lint));
}

fn checkBuild(allocator: Allocator) !bool {
    if (try checkFormat("build.zig", allocator)) return true;
    if (try lintFile("build.zig", fs.cwd(), "build.zig", allocator)) return true;
    return false;
}

fn checkFormat(file_path: []const u8, allocator: Allocator) !bool {
    const argv = &.{ "zig", "fmt", "--check", file_path };

    var child = std.ChildProcess.init(argv, allocator);
    const term = child.spawnAndWait() catch |err| {
        const stderr = std.io.getStdErr().writer();
        try stderr.print("Unable to spawn 'zig fmt': {s}\n", .{@errorName(err)});
        return true;
    };

    switch (term) {
        .Exited => |code| {
            if (code != 0) {
                const stderr = std.io.getStdErr().writer();
                try stderr.print("'zig fmt' exited with error code {}:\n", .{code});
                return true;
            }
        },
        else => {
            const stderr = std.io.getStdErr().writer();
            try stderr.print("'zig fmt' exited unexpectedly\n", .{});
            return true;
        },
    }
    return false;
}

// Line length linting logic forked from coilhq/tigerbeetle's Apache-2 licensed scripts/lint.zig
// with added support for  includes support for skipping entire files.
// The full license can be found at https://github.com/coilhq/tigerbeetle/blob/main/LICENSE

const Ignored = union(enum) { lines: []const u32, all };
const ignore = std.ComptimeStringMap(Ignored, .{.{ "/dev/null", .all }});

fn ignored(raw_path: []const u8, line: u32, allocator: Allocator) !bool {
    var path = try allocator.dupe(u8, raw_path);
    std.mem.replaceScalar(u8, path, fs.path.sep_windows, fs.path.sep_posix);
    defer allocator.free(path);

    const value = ignore.get(path) orelse return false;
    switch (value) {
        .lines => |lines| return std.mem.indexOfScalar(u32, lines, line) != null,
        .all => return true,
    }
}

var seen = std.AutoArrayHashMapUnmanaged(fs.File.INode, void){};

const LintError =
    error{ OutOfMemory, NotUtf8 } || fs.File.OpenError || fs.File.ReadError || fs.File.WriteError;

fn lintDir(
    file_path: []const u8,
    parent_dir: fs.Dir,
    parent_sub_path: []const u8,
    allocator: Allocator,
) LintError!bool {
    var err = false;

    var iterable_dir = try parent_dir.openIterableDir(parent_sub_path, .{});
    defer iterable_dir.close();

    var dir = iterable_dir.dir;

    const stat = try dir.stat();
    if (try seen.fetchPut(allocator, stat.inode, {})) |_| return err;

    var dir_it = iterable_dir.iterate();
    while (try dir_it.next()) |entry| {
        const is_dir = entry.kind == .directory;
        if (is_dir or std.mem.endsWith(u8, entry.name, ".zig")) {
            const full_path = try fs.path.join(allocator, &[_][]const u8{ file_path, entry.name });
            defer allocator.free(full_path);

            var e = false;
            if (is_dir) {
                e = try lintDir(full_path, dir, entry.name, allocator);
            } else {
                e = try lintFile(full_path, dir, entry.name, allocator);
            }
            err = err or e;
        }
    }

    return err;
}

fn lintFile(file_path: []const u8, dir: fs.Dir, sub_path: []const u8, allocator: Allocator) !bool {
    const source_file = try dir.openFile(sub_path, .{});
    defer source_file.close();

    const source = try source_file.readToEndAllocOptions(
        allocator,
        std.math.maxInt(usize),
        null,
        @alignOf(u8),
        0,
    );

    return lintLineLength(source, file_path, allocator);
}

fn lintLineLength(source: []const u8, path: []const u8, allocator: Allocator) !bool {
    _ = allocator;

    var err = false;
    var i: usize = 0;
    var line: u32 = 1;
    while (std.mem.indexOfScalar(u8, source[i..], '\n')) |newline| : (line += 1) {
        const line_length =
            std.unicode.utf8CountCodepoints(source[i..][0..newline]) catch return error.NotUtf8;
        if (line_length > LINE_LENGTH) {
            const stderr = std.io.getStdErr().writer();
            try stderr.print(
                "{s}:{d} has a length of {d}. Maximum allowed is 100\n",
                .{ path, line, line_length },
            );
            err = true;
        }
        i += newline + 1;
    }
    return err;
}
