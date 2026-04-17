import { describe, expect, it } from "vitest";
import { defineEvent } from "#lib/event-bus";
import {
	type DiscoveredPlugin,
	PLUGIN_NAMES,
	sortByDependencies,
} from "./discovery";

function makeDiscovered(name: string, dependsOn?: string[]): DiscoveredPlugin {
	return {
		name,
		cli: {
			name,
			label: name,
			implicit: false,
			depends: (dependsOn ?? []).map((dep) =>
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
