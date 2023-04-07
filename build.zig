const std = @import("std");
const builtin = @import("builtin");

const pkmn = @import("node_modules/@pkmn/engine/build.zig");

pub fn build(b: *std.Build) !void {
    const release = if (std.os.getenv("DEBUG_PKMN_ENGINE")) |_| false else true;
    const target = std.zig.CrossTarget{};

    const showdown =
        b.option(bool, "showdown", "Enable Pokémon Showdown compatibility mode") orelse true;
    const module = pkmn.module(b, .{ .showdown = showdown });

    const BIN = b.pathJoin(&.{ "node_modules", ".bin" });
    const install = b.findProgram(&.{"install-pkmn-engine"}, &.{BIN}) catch unreachable;
    const options = b.fmt("--options=-Dtrace{s}", .{if (showdown) " -Dshowdown" else ""});
    const engine = b.addSystemCommand(&[_][]const u8{ install, options, "--silent" });
    b.getInstallStep().dependOn(&engine.step);

    const NODE_MODULES = b.pathJoin(&.{ "node_modules", "@pkmn", "@engine", "build" });
    const node = if (b.findProgram(&.{"node"}, &.{})) |path| path else |_| {
        try std.io.getStdErr().writeAll("Cannot find node\n");
        std.process.exit(1);
    };
    var node_headers = headers: {
        var headers = resolve(b, &.{ node, "..", "..", "include", "node" });
        var node_h = b.pathJoin(&.{ headers, "node.h" });
        if (try exists(headers)) break :headers headers;
        headers = resolve(b, &.{ NODE_MODULES, "include" });
        node_h = b.pathJoin(&.{ headers, "node.h" });
        if (try exists(headers)) break :headers headers;
        try std.io.getStdErr().writeAll("Cannot find node headers\n");
        std.process.exit(1);
    };
    const windows = (try std.zig.system.NativeTargetInfo.detect(target)).target.os.tag == .windows;
    const node_import_lib = if (windows) lib: {
        var lib = resolve(b, &.{ node, "..", "node.lib" });
        if (try exists(lib)) break :lib lib;
        lib = resolve(b, &.{ NODE_MODULES, "lib", "node.lib" });
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
        if (b.findProgram(&.{"strip"}, &.{})) |strip| {
            if (builtin.os.tag != .macos) {
                const sh = b.addSystemCommand(&.{ strip, "-s" });
                sh.addArtifactArg(addon);
                b.getInstallStep().dependOn(&sh.step);
            }
        } else |_| {}
    }
    b.getInstallStep().dependOn(&InstallAddonStep.create(b, addon).step);

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
        if (b.findProgram(&.{"wasm-opt"}, &.{BIN})) |opt| {
            const sh = b.addSystemCommand(&.{ opt, "-O4" });
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

fn resolve(b: *std.Build, paths: []const []const u8) []u8 {
    return std.fs.path.resolve(b.allocator, paths) catch @panic("OOM");
}

fn exists(path: []const u8) !bool {
    return if (std.fs.accessAbsolute(path, .{})) |_| true else |err| switch (err) {
        error.FileNotFound => false,
        else => return err,
    };
}

const InstallAddonStep = struct {
    b: *std.Build,
    step: std.Build.Step,
    artifact: *std.Build.CompileStep,
    dir: std.Build.InstallDir,

    fn create(b: *std.Build, artifact: *std.Build.CompileStep) *InstallAddonStep {
        const self = b.allocator.create(InstallAddonStep) catch unreachable;
        const dir = std.Build.InstallDir{ .lib = {} };
        self.* = .{
            .b = b,
            .step = std.build.Step.init(.{
                .id = .custom,
                .name = "install addon",
                .owner = b,
                .makeFn = make,
            }),
            .artifact = artifact,
            .dir = dir,
        };
        self.step.dependOn(&artifact.step);
        b.pushInstalledFile(dir, "addon.node");
        return self;
    }

    fn make(step: *std.Build.Step, _: *std.Progress.Node) !void {
        const self = @fieldParentPtr(InstallAddonStep, "step", step);
        const src = self.artifact.getOutputSource().getPath(self.b);
        const dst = self.b.getInstallPath(self.dir, "addon.node");
        const cwd = std.fs.cwd();
        const p = std.fs.Dir.updateFile(cwd, src, cwd, dst, .{}) catch |err| {
            return step.fail("unable to update file from '{s}' to '{s}': {s}", .{
                src, dst, @errorName(err),
            });
        };
        step.result_cached = p == .fresh;
    }
};
