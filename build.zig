const std = @import("std");
const builtin = @import("builtin");

const pkmn = @import("node_modules/@pkmn/engine/build.zig");

pub fn build(b: *std.Build) !void {
    const release = if (std.os.getenv("DEBUG_PKMN_ENGINE")) |_| false else true;
    const target = std.zig.CrossTarget{};

    const BIN = try std.fs.path.join(b.allocator, &[_][]const u8{ "node_modules", ".bin" });
    const NODE_MODULES = try std.fs.path.join(
        b.allocator,
        &[_][]const u8{ "node_modules", "@pkmn", "@engine", "build" },
    );

    const showdown =
        b.option(bool, "showdown", "Enable Pokémon Showdown compatibility mode") orelse false;
    const module = pkmn.module(b, .{ .showdown = showdown }); // FIXME plumb through optimize mode

    if (b.findProgram(&[_][]const u8{"install-pkmn-engine"}, &[_][]const u8{BIN})) |install| {
        const options = b.fmt("--options=-Dtrace{s}", .{if (showdown) " -Dshowdown" else ""});
        const sh = b.addSystemCommand(&[_][]const u8{ install, options });
        b.getInstallStep().dependOn(&sh.step);
    } else |_| {
        try std.io.getStdErr().writeAll("Cannot find install-pkmn-engine - run `npm install`\n");
        std.process.exit(1);
    }

    const node = if (b.findProgram(&[_][]const u8{"node"}, &[_][]const u8{})) |path| path else |_| {
        try std.io.getStdErr().writeAll("Cannot find node\n");
        std.process.exit(1);
    };
    var node_headers = headers: {
        var headers = try std.fs.path.resolve(
            b.allocator,
            &[_][]const u8{ node, "..", "..", "include", "node" },
        );
        var node_h = try std.fs.path.join(b.allocator, &[_][]const u8{ headers, "node.h" });
        if (try exists(headers)) break :headers headers;
        headers = try std.fs.path.resolve(
            b.allocator,
            &[_][]const u8{ NODE_MODULES, "include" },
        );
        node_h = try std.fs.path.join(b.allocator, &[_][]const u8{ headers, "node.h" });
        if (try exists(headers)) break :headers headers;
        try std.io.getStdErr().writeAll("Cannot find node headers\n");
        std.process.exit(1);
    };
    const windows = (try std.zig.system.NativeTargetInfo.detect(target)).target.os.tag == .windows;
    const node_import_lib = if (windows) lib: {
        var lib = try std.fs.path.resolve(b.allocator, &[_][]const u8{ node, "..", "node.lib" });
        if (try exists(lib)) break :lib lib;
        lib = try std.fs.path.resolve(
            b.allocator,
            &[_][]const u8{ NODE_MODULES, "lib", "node.lib" },
        );
        if (try exists(lib)) break :lib lib;
        try std.io.getStdErr().writeAll("Cannot find node import lib\n");
        std.process.exit(1);
    } else null;

    const addon = b.addSharedLibrary(.{
        .name = "addon",
        .root_source_file = .{ .path = "src/lib/binding/node.zig" },
        .optimize = if (release) .ReleaseFast else .Debug,
        .target = target,
    });
    addon.addModule("pkmn", module);
    addon.setMainPkgPath("./");
    addon.addSystemIncludePath(node_headers);
    addon.linkLibC();
    if (node_import_lib) |il| addon.addObjectFile(il);
    addon.linker_allow_shlib_undefined = true;
    if (release) {
        addon.strip = true;
        if (b.findProgram(&[_][]const u8{"strip"}, &[_][]const u8{})) |strip| {
            if (builtin.os.tag != .macos) {
                const sh = b.addSystemCommand(&[_][]const u8{ strip, "-s" });
                sh.addArtifactArg(addon);
                b.getInstallStep().dependOn(&sh.step);
            }
        } else |_| {}
    }
    // FIXME: dont shell out...
    const cp = b.addSystemCommand(&[_][]const u8{"cp"});
    cp.addArtifactArg(addon);
    cp.addArg("build/lib/addon.node");
    b.getInstallStep().dependOn(&cp.step);

    const wasm = b.addSharedLibrary(.{
        .name = "addon",
        .root_source_file = .{ .path = "src/lib/binding/wasm.zig" },
        .optimize = if (release) .ReleaseSmall else .Debug,
        .target = .{ .cpu_arch = .wasm32, .os_tag = .freestanding },
    });
    wasm.addModule("pkmn", module);
    wasm.setMainPkgPath("./");
    wasm.stack_size = std.wasm.page_size;
    wasm.rdynamic = true;
    if (release) {
        wasm.strip = true;
        if (b.findProgram(&[_][]const u8{"wasm-opt"}, &[_][]const u8{BIN})) |opt| {
            const sh = b.addSystemCommand(&[_][]const u8{ opt, "-O4" });
            sh.addArtifactArg(wasm);
            sh.addArg("-o");
            sh.addFileSourceArg(.{ .path = "build/lib/addon.wasm" });
            b.getInstallStep().dependOn(&sh.step);
        } else |_| {}
    }
    wasm.install();

    const test_file = b.option([]const u8, "test-file", "Input file for test") orelse
        "src/lib/test.zig";
    const test_bin = b.option([]const u8, "test-bin", "Emit test binary to");
    const test_filter =
        b.option([]const u8, "test-filter", "Skip tests that do not match filter");
    const test_no_exec =
        b.option(bool, "test-no-exec", "Compiles test binary without running it") orelse false;

    const tests = b.addTest(.{
        .name = std.fs.path.basename(std.fs.path.dirname(test_file).?),
        .root_source_file = .{ .path = test_file },
        .optimize = if (release) .ReleaseSafe else .Debug,
        .target = target,
    });
    tests.setMainPkgPath("./");
    tests.setFilter(test_filter);
    tests.single_threaded = true;
    if (test_bin) |bin| {
        tests.name = std.fs.path.basename(bin);
        if (std.fs.path.dirname(bin)) |dir| tests.setOutputDir(dir);
    }

    const lint_exe =
        b.addExecutable(.{ .name = "lint", .root_source_file = .{ .path = "src/tools/lint.zig" } });
    const lint = lint_exe.run();

    b.step("lint", "Lint source files").dependOn(&lint.step);
    b.step("test", "Run all tests").dependOn(if (test_no_exec) &tests.step else &tests.run().step);
}

fn exists(path: []const u8) !bool {
    return if (std.fs.accessAbsolute(path, .{})) |_| true else |err| switch (err) {
        error.FileNotFound => false,
        else => return err,
    };
}
