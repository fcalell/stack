import type { PluginConfig, StackConfig } from "@fcalell/config";
import { describe, expect, it } from "vitest";
import {
	OFFICIAL_PLUGINS,
	type DiscoveredPlugin,
	sortByDependencies,
} from "./discovery";

function makeConfig(
	plugins: Array<{ name: string; requires?: string[] }>,
): StackConfig {
	return {
		plugins: plugins.map((p) => ({
			__plugin: p.name,
			requires: p.requires ?? [],
			options: {},
		})) as unknown as readonly PluginConfig[],
		validate: () => ({ valid: true, errors: [] }),
	};
}

function makeDiscovered(name: string): DiscoveredPlugin {
	return {
		name,
		cli: {
			name,
			label: name,
			detect: async () => false,
			scaffold: async () => {},
			bindings: () => [],
			generate: async () => [],
		},
		options: {},
	};
}

describe("sortByDependencies", () => {
	it("returns plugins in dependency order", () => {
		const config = makeConfig([
			{ name: "auth", requires: ["db"] },
			{ name: "db" },
			{ name: "api" },
		]);

		const discovered = [
			makeDiscovered("auth"),
			makeDiscovered("db"),
			makeDiscovered("api"),
		];

		const sorted = sortByDependencies(discovered, config);
		const names = sorted.map((p) => p.name);

		expect(names.indexOf("db")).toBeLessThan(names.indexOf("auth"));
	});

	it("handles plugins with no dependencies", () => {
		const config = makeConfig([
			{ name: "app" },
			{ name: "db" },
		]);

		const discovered = [
			makeDiscovered("app"),
			makeDiscovered("db"),
		];

		const sorted = sortByDependencies(discovered, config);
		expect(sorted).toHaveLength(2);
	});

	it("handles empty list", () => {
		const config = makeConfig([]);
		const sorted = sortByDependencies([], config);
		expect(sorted).toHaveLength(0);
	});

	it("does not duplicate plugins", () => {
		const config = makeConfig([
			{ name: "auth", requires: ["db"] },
			{ name: "api", requires: ["db"] },
			{ name: "db" },
		]);

		const discovered = [
			makeDiscovered("auth"),
			makeDiscovered("api"),
			makeDiscovered("db"),
		];

		const sorted = sortByDependencies(discovered, config);
		const names = sorted.map((p) => p.name);
		expect(new Set(names).size).toBe(names.length);
	});
});

describe("OFFICIAL_PLUGINS", () => {
	it("contains the core plugins", () => {
		const names = OFFICIAL_PLUGINS.map((p) => p.name);
		expect(names).toContain("db");
		expect(names).toContain("auth");
		expect(names).toContain("api");
		expect(names).toContain("app");
	});

	it("auth requires db", () => {
		const auth = OFFICIAL_PLUGINS.find((p) => p.name === "auth");
		expect(auth?.requires).toContain("db");
	});
});
