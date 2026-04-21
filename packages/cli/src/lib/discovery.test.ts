import { describe, expect, it, vi } from "vitest";
import type { StackConfig } from "#config";
import { defineEvent } from "#lib/event-bus";
import {
	type DiscoveredPlugin,
	discoverPlugins,
	FIRST_PARTY_PLUGINS,
	PLUGIN_NAMES,
	sortByDependencies,
	validateDependencies,
} from "./discovery";

function makeDiscovered(name: string, dependsOn?: string[]): DiscoveredPlugin {
	return {
		name,
		cli: {
			name,
			label: name,
			package: `@fcalell/plugin-${name}`,
			after: (dependsOn ?? []).map((dep) =>
				defineEvent<void>(dep, `${dep}.ready`),
			),
			callbacks: {},
			commands: {},
			register: () => {},
		},
		events: {},
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
		// C depends on B, B depends on A. Sorted order must place A before B before C.
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
	it("throws when a plugin depends on an event from a missing plugin", () => {
		// auth depends on db's SchemaReady event, but db is not in the list.
		const discovered = [makeDiscovered("auth", ["db"])];

		expect(() => validateDependencies(discovered)).toThrow(
			/\[auth\] must run after event 'db\.ready' from plugin 'db'.*not in your config.*Add db\(\) to plugins array/,
		);
	});

	it("does not throw when all dependencies are present", () => {
		const discovered = [makeDiscovered("auth", ["db"]), makeDiscovered("db")];

		expect(() => validateDependencies(discovered)).not.toThrow();
	});

	it("ignores 'core' dependencies", () => {
		const discovered: DiscoveredPlugin[] = [
			{
				name: "a",
				cli: {
					name: "a",
					label: "a",
					package: "@fcalell/plugin-a",
					after: [defineEvent<void>("core", "Init.Scaffold")],
					callbacks: {},
					commands: {},
					register: () => {},
				},
				events: {},
				options: {},
			},
		];

		expect(() => validateDependencies(discovered)).not.toThrow();
	});
});

describe("PLUGIN_NAMES", () => {
	it("contains the core plugins", () => {
		expect(PLUGIN_NAMES).toContain("db");
		expect(PLUGIN_NAMES).toContain("auth");
		expect(PLUGIN_NAMES).toContain("api");
		expect(PLUGIN_NAMES).toContain("vite");
		expect(PLUGIN_NAMES).toContain("solid");
		expect(PLUGIN_NAMES).toContain("solid-ui");
	});
});

describe("FIRST_PARTY_PLUGINS", () => {
	it("maps each first-party plugin name to its @fcalell/plugin-* package", () => {
		for (const entry of FIRST_PARTY_PLUGINS) {
			expect(entry.package).toBe(`@fcalell/plugin-${entry.name}`);
		}
	});
});

describe("discoverPlugins — third-party plugins via __package", () => {
	it("imports the package named in __package instead of fabricating @fcalell/plugin-*", async () => {
		// A consumer installed a third-party plugin published under an
		// unrelated npm namespace. The plugin's config factory stamped
		// __package onto its output; discovery must honour it.
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
						after: [],
						callbacks: {},
						commands: {},
						register: () => {},
					},
					events: {},
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
		// Older configs (pre-__package) should still resolve via the legacy
		// first-party convention without touching their call sites.
		vi.doMock("@fcalell/plugin-legacy", () => ({
			legacy: {
				__plugin: "legacy",
				cli: {
					name: "legacy",
					label: "Legacy",
					package: "@fcalell/plugin-legacy",
					after: [],
					callbacks: {},
					commands: {},
					register: () => {},
				},
				events: {},
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

describe("discoverPlugins — missing dependency", () => {
	it("throws when a top-level plugin depends on an event from a plugin not in the config", async () => {
		// "parent" is the top-level plugin the consumer put in their config.
		// It must run after an event sourced from "ghost", which the consumer
		// forgot to add. Discovery surfaces the actionable error.
		vi.doMock("@fcalell/plugin-parent", () => ({
			parent: {
				__plugin: "parent",
				cli: {
					name: "parent",
					label: "Parent",
					package: "@fcalell/plugin-parent",
					after: [defineEvent<void>("ghost", "ghost.ready")],
					callbacks: {},
					commands: {},
					register: () => {},
				},
				events: {},
			},
		}));

		const config: StackConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [{ __plugin: "parent", options: {} }],
			validate: () => ({ valid: true, errors: [] }),
		};

		await expect(discoverPlugins(config)).rejects.toThrow(
			/\[parent\] must run after event 'ghost\.ready' from plugin 'ghost'.*not in your config/,
		);

		vi.doUnmock("@fcalell/plugin-parent");
	});
});
