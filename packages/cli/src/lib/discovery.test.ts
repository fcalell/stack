import { describe, expect, it, vi } from "vitest";
import type { StackConfig } from "#config";
import {
	type DiscoveredPlugin,
	discoverPlugins,
	loadAvailablePlugins,
	sortByDependencies,
	validateDependencies,
} from "./discovery";

function makeDiscovered(
	name: string,
	requires: string[] = [],
): DiscoveredPlugin {
	const cli = {
		name,
		label: name,
		package: `@fcalell/plugin-${name}`,
		requires,
		callbacks: {},
		commands: {},
		dependencies: {},
		devDependencies: {},
		gitignore: [] as readonly string[],
		schema: undefined,
		template: (n: string) => new URL(`file:///stub/${name}/${n}`),
		scaffold: (n: string, target: string) => ({
			source: new URL(`file:///stub/${name}/${n}`),
			target,
			plugin: name,
		}),
		collect: () => ({ slots: {}, contributes: [] }),
	};
	// Factory is structurally present but unused in these tests — stub it
	// with any-ish casts because DiscoveredPlugin carries a fully-typed one.
	return {
		name,
		cli,
		factory: { cli } as unknown as DiscoveredPlugin["factory"],
		options: {},
	};
}

describe("sortByDependencies", () => {
	it("returns plugins in dependency order", () => {
		const discovered = [
			makeDiscovered("auth", ["db"]),
			makeDiscovered("db"),
			makeDiscovered("api"),
		];

		const sorted = sortByDependencies(discovered);
		const names = sorted.map((p) => p.name);

		expect(names.indexOf("db")).toBeLessThan(names.indexOf("auth"));
	});

	it("handles plugins with no dependencies", () => {
		const discovered = [makeDiscovered("app"), makeDiscovered("db")];

		const sorted = sortByDependencies(discovered);
		expect(sorted).toHaveLength(2);
	});

	it("handles empty list", () => {
		const sorted = sortByDependencies([]);
		expect(sorted).toHaveLength(0);
	});

	it("does not duplicate plugins", () => {
		const discovered = [
			makeDiscovered("auth", ["db"]),
			makeDiscovered("api", ["db"]),
			makeDiscovered("db"),
		];

		const sorted = sortByDependencies(discovered);
		const names = sorted.map((p) => p.name);
		expect(new Set(names).size).toBe(names.length);
	});

	it("sorts a valid linear chain A -> B -> C correctly", () => {
		// C requires B, B requires A. Sorted order must place A before B before C.
		const discovered = [
			makeDiscovered("c", ["b"]),
			makeDiscovered("b", ["a"]),
			makeDiscovered("a"),
		];

		const sorted = sortByDependencies(discovered);
		const names = sorted.map((p) => p.name);
		expect(names).toEqual(["a", "b", "c"]);
	});

	it("throws on a two-plugin mutual dependency cycle", () => {
		const discovered = [makeDiscovered("a", ["b"]), makeDiscovered("b", ["a"])];

		expect(() => sortByDependencies(discovered)).toThrow(
			/Circular plugin dependency: a -> b -> a/,
		);
	});

	it("throws on a three-plugin cycle and includes the full path", () => {
		const discovered = [
			makeDiscovered("a", ["b"]),
			makeDiscovered("b", ["c"]),
			makeDiscovered("c", ["a"]),
		];

		expect(() => sortByDependencies(discovered)).toThrow(
			/Circular plugin dependency: a -> b -> c -> a/,
		);
	});
});

describe("validateDependencies", () => {
	it("throws when a plugin `requires` a missing sibling", () => {
		const discovered = [makeDiscovered("auth", ["db"])];

		expect(() => validateDependencies(discovered)).toThrow(
			/\[auth\] requires plugin 'db'.*not in your config.*Add db\(\) to plugins array/,
		);
	});

	it("does not throw when all required plugins are present", () => {
		const discovered = [makeDiscovered("auth", ["db"]), makeDiscovered("db")];

		expect(() => validateDependencies(discovered)).not.toThrow();
	});
});

describe("loadAvailablePlugins", () => {
	it("loads cloudflare and native-ui so init/add can offer them", async () => {
		// Behavioral guard, not a re-statement of the const: these two plugins
		// shipped in plugins/ but were absent from the discovery list, so
		// `stack init --plugins=…,native-ui` errored "unknown plugin" and
		// explicit cloudflare selection failed. This actually imports each
		// package, so it also catches a plugin whose export is malformed.
		const names = (await loadAvailablePlugins()).map((p) => p.name);
		expect(names).toContain("cloudflare");
		expect(names).toContain("native-ui");
	});
});

describe("discoverPlugins — third-party plugins via __package", () => {
	it("imports the package named in __package instead of fabricating @fcalell/plugin-*", async () => {
		const thirdPartyPackage = "@acme/stack-plugin-widget";
		const importedPackages: string[] = [];

		vi.doMock(thirdPartyPackage, async () => {
			importedPackages.push(thirdPartyPackage);
			return {
				widget: {
					__plugin: "widget",
					cli: {
						name: "widget",
						label: "Widget",
						package: thirdPartyPackage,
						requires: [] as string[],
						callbacks: {},
						commands: {},
						dependencies: {},
						devDependencies: {},
						gitignore: [] as readonly string[],
						template: (n: string) => new URL(`file:///stub/widget/${n}`),
						scaffold: (n: string, target: string) => ({
							source: new URL(`file:///stub/widget/${n}`),
							target,
							plugin: "widget",
						}),
						collect: () => ({ slots: {}, contributes: [] }),
					},
				},
			};
		});

		const config: StackConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [
				{
					__plugin: "widget",
					__package: thirdPartyPackage,
					options: { foo: "bar" },
				},
			],
			validate: () => ({ valid: true, errors: [] }),
		};

		const plugins = await discoverPlugins(config);

		expect(importedPackages).toContain(thirdPartyPackage);
		expect(plugins).toHaveLength(1);
		expect(plugins[0]?.name).toBe("widget");
		expect(plugins[0]?.cli.package).toBe(thirdPartyPackage);
		expect(plugins[0]?.options).toEqual({ foo: "bar" });

		vi.doUnmock(thirdPartyPackage);
	});

	it("falls back to @fcalell/plugin-<name> when __package is absent (back-compat)", async () => {
		vi.doMock("@fcalell/plugin-legacy", () => ({
			legacy: {
				__plugin: "legacy",
				cli: {
					name: "legacy",
					label: "Legacy",
					package: "@fcalell/plugin-legacy",
					requires: [] as string[],
					callbacks: {},
					commands: {},
					dependencies: {},
					devDependencies: {},
					gitignore: [] as readonly string[],
					template: (n: string) => new URL(`file:///stub/legacy/${n}`),
					scaffold: (n: string, target: string) => ({
						source: new URL(`file:///stub/legacy/${n}`),
						target,
						plugin: "legacy",
					}),
					collect: () => ({ slots: {}, contributes: [] }),
				},
			},
		}));

		const config: StackConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [{ __plugin: "legacy", options: {} }],
			validate: () => ({ valid: true, errors: [] }),
		};

		const plugins = await discoverPlugins(config);
		expect(plugins).toHaveLength(1);
		expect(plugins[0]?.name).toBe("legacy");

		vi.doUnmock("@fcalell/plugin-legacy");
	});
});

describe("discoverPlugins — missing required plugin", () => {
	it("throws when a top-level plugin requires a sibling not in the config", async () => {
		vi.doMock("@fcalell/plugin-parent", () => ({
			parent: {
				__plugin: "parent",
				cli: {
					name: "parent",
					label: "Parent",
					package: "@fcalell/plugin-parent",
					requires: ["ghost"],
					callbacks: {},
					commands: {},
					dependencies: {},
					devDependencies: {},
					gitignore: [] as readonly string[],
					template: (n: string) => new URL(`file:///stub/parent/${n}`),
					scaffold: (n: string, target: string) => ({
						source: new URL(`file:///stub/parent/${n}`),
						target,
						plugin: "parent",
					}),
					collect: () => ({ slots: {}, contributes: [] }),
				},
			},
		}));

		const config: StackConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [{ __plugin: "parent", options: {} }],
			validate: () => ({ valid: true, errors: [] }),
		};

		await expect(discoverPlugins(config)).rejects.toThrow(
			/\[parent\] requires plugin 'ghost'.*not in your config/,
		);

		vi.doUnmock("@fcalell/plugin-parent");
	});
});
