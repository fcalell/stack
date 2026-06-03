import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { plugin } from "#config";
import { cliSlots } from "#lib/cli-slots";
import { buildTestGraphFromPlugins } from "#testing";
import { pruneObjectField, remove } from "./remove";

describe("remove: single-plugin graph resolution", () => {
	it("resolves removeFiles / removeDeps / removeDevDeps from the target plugin alone", async () => {
		const target = plugin("rm-target", {
			label: "Target",
			contributes: [cliSlots.removeFiles.contribute(() => "src/feature/")],
			dependencies: { "@target/pkg": "^1.0.0" },
			devDependencies: { "target-cli": "^2.0.0" },
		});

		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: target }],
		});
		const [files, deps, devDeps] = await Promise.all([
			graph.resolve(cliSlots.removeFiles),
			graph.resolve(cliSlots.removeDeps),
			graph.resolve(cliSlots.removeDevDeps),
		]);

		expect(files).toContain("src/feature/");
		expect(deps).toContain("@target/pkg");
		expect(devDeps).toContain("target-cli");
	});

	it("auto-contributes `removeDeps` from plugin-declared dependencies without the consumer repeating them", async () => {
		const fake = plugin("rm-auto", {
			label: "Auto",
			dependencies: { foo: "^1.0.0", bar: "^2.0.0" },
		});
		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: fake }],
		});
		const deps = await graph.resolve(cliSlots.removeDeps);
		expect(deps.sort()).toEqual(["bar", "foo"]);
	});
});

describe("pruneObjectField", () => {
	it("removes matching keys and reports the change", () => {
		const pkg: Record<string, unknown> = {
			dependencies: { keep: "1.0.0", drop: "2.0.0" },
		};
		const changed = pruneObjectField(pkg, "dependencies", new Set(["drop"]));
		expect(changed).toBe(true);
		expect(pkg).toEqual({ dependencies: { keep: "1.0.0" } });
	});

	it("deletes the whole field when pruning empties it", () => {
		const pkg: Record<string, unknown> = {
			dependencies: { drop: "2.0.0" },
		};
		const changed = pruneObjectField(pkg, "dependencies", new Set(["drop"]));
		expect(changed).toBe(true);
		expect(pkg).toEqual({});
		expect("dependencies" in pkg).toBe(false);
	});

	it("treats whole-field deletion of a pre-existing empty object as a change worth persisting", () => {
		// Caller relies on the boolean to gate writeFileSync. A stray empty
		// `"dependencies": {}` left by a previous tool is still a change worth
		// recording — otherwise package.json keeps a useless empty shell.
		const pkg: Record<string, unknown> = { dependencies: {} };
		const changed = pruneObjectField(pkg, "dependencies", new Set([]));
		expect(changed).toBe(true);
		expect("dependencies" in pkg).toBe(false);
	});

	it("returns false when the field is absent or non-object", () => {
		expect(pruneObjectField({}, "dependencies", new Set(["x"]))).toBe(false);
		expect(
			pruneObjectField({ dependencies: null }, "dependencies", new Set(["x"])),
		).toBe(false);
		expect(
			pruneObjectField({ dependencies: ["x"] }, "dependencies", new Set(["x"])),
		).toBe(false);
		expect(
			pruneObjectField(
				{ dependencies: "string" },
				"dependencies",
				new Set(["x"]),
			),
		).toBe(false);
	});

	it("returns false when no matching keys are present and the field stays non-empty", () => {
		const pkg: Record<string, unknown> = {
			dependencies: { keep: "1.0.0" },
		};
		expect(
			pruneObjectField(pkg, "dependencies", new Set(["nonexistent"])),
		).toBe(false);
		expect(pkg).toEqual({ dependencies: { keep: "1.0.0" } });
	});
});

describe("remove() — degraded path when the target plugin module fails to load", () => {
	let dir: string;
	const originalCwd = process.cwd();

	afterEach(() => {
		process.chdir(originalCwd);
		if (dir) rmSync(dir, { recursive: true, force: true });
	});

	// When `discoverPlugins` throws because the target plugin's package
	// can't be imported, `remove` must still drop the plugin's package
	// from `package.json` — otherwise the user has no way to clean up a
	// broken plugin without hand-editing the file.
	//
	// We hand-roll the `StackConfig` shape (validate() + plugins) in a
	// `.mjs` so `loadConfig` can `await import(...)` it without resolving
	// the missing plugin package — the package is only a string literal
	// in the plugins array, never imported. The file lives entirely
	// inside /tmp/... where node_modules isn't reachable, so it can't
	// pull in `defineConfig` either.
	//
	// In a real consumer repo `loadConfig` would also fail when
	// `stack.config.ts` imports the missing package; that's a separate
	// concern handled at the loader layer. The bug we're fixing is the
	// `remove` layer's handling of `discoverPlugins` failure once we get
	// past loading.
	it("removes the package from package.json even when the target plugin module is missing", async () => {
		dir = mkdtempSync(join(tmpdir(), "stack-rm-degraded-"));
		const configPath = join(dir, "stack.config.mjs");
		writeFileSync(
			configPath,
			`export default {
	app: { name: "app", domain: "example.com" },
	plugins: [
		{ __plugin: "ghost", __package: "@nope/does-not-exist", options: {} },
	],
	validate() { return { valid: true, errors: [] }; },
};
`,
		);
		writeFileSync(
			join(dir, "package.json"),
			`${JSON.stringify(
				{
					name: "app",
					dependencies: {
						"@nope/does-not-exist": "^1.0.0",
						"unrelated-pkg": "^1.0.0",
					},
				},
				null,
				"\t",
			)}\n`,
		);

		process.chdir(dir);
		// `removePluginCall` will reject the hand-rolled config shape
		// (it expects `defineConfig({...})`) — that's fine for this
		// test; we only care that the package.json side of the
		// degraded path works. Catch the EditConfigError so it doesn't
		// fail the assertion path.
		await remove("ghost", "stack.config.mjs").catch((err: unknown) => {
			// Acceptable: magicast can't edit the hand-rolled shape.
			if (
				err instanceof Error &&
				err.message.includes("Could not automatically edit")
			)
				return;
			throw err;
		});

		const pkg = JSON.parse(
			readFileSync(join(dir, "package.json"), "utf-8"),
		) as Record<string, unknown>;
		expect(
			(pkg.dependencies as Record<string, string> | undefined)?.[
				"@nope/does-not-exist"
			],
		).toBeUndefined();
		// Sibling deps untouched.
		expect(
			(pkg.dependencies as Record<string, string> | undefined)?.[
				"unrelated-pkg"
			],
		).toBe("^1.0.0");
	});

	it("rejects with MissingPluginError when the requested plugin isn't in the config at all", async () => {
		dir = mkdtempSync(join(tmpdir(), "stack-rm-absent-"));
		const configPath = join(dir, "stack.config.mjs");
		writeFileSync(
			configPath,
			`export default {
	app: { name: "app", domain: "example.com" },
	plugins: [],
	validate() { return { valid: true, errors: [] }; },
};
`,
		);
		process.chdir(dir);
		await expect(remove("nonexistent", "stack.config.mjs")).rejects.toThrow(
			/not in your config/,
		);
	});
});
