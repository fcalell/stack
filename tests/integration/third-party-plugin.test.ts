import { defineConfig, type StackConfig } from "@fcalell/cli";
import { discoverPlugins, sortByDependencies } from "@fcalell/cli/discovery";
import { describe, expect, it, vi } from "vitest";

// A third-party plugin published under an unrelated npm namespace. This
// mirrors the shape `createPlugin("widget", { package: "@acme/stack-plugin-widget" })`
// would produce: the factory stamps __package on its output and `cli.package`
// matches.
const THIRD_PARTY_PACKAGE = "@acme/stack-plugin-widget";

describe("Third-party plugin discovery (config carries __package)", () => {
	it("discovers a plugin published under an arbitrary npm namespace", async () => {
		const registerSpy = vi.fn();

		vi.doMock(THIRD_PARTY_PACKAGE, () => ({
			widget: {
				__plugin: "widget",
				cli: {
					name: "widget",
					label: "Widget",
					package: THIRD_PARTY_PACKAGE,
					after: [],
					callbacks: {},
					commands: {},
					register: registerSpy,
				},
				events: {},
			},
		}));

		// Emulate what a consumer's call to `widget({ color: "red" })` would
		// produce — createPlugin stamps __package onto the returned config.
		const widgetConfig = {
			__plugin: "widget" as const,
			__package: THIRD_PARTY_PACKAGE,
			options: { color: "red" },
		};

		const config: StackConfig = defineConfig({
			app: { name: "app", domain: "example.com" },
			plugins: [widgetConfig],
		});

		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);

		expect(sorted).toHaveLength(1);
		expect(sorted[0]?.name).toBe("widget");
		expect(sorted[0]?.cli.package).toBe(THIRD_PARTY_PACKAGE);
		expect(sorted[0]?.options).toEqual({ color: "red" });

		vi.doUnmock(THIRD_PARTY_PACKAGE);
	});

	it("third-party plugin composes with first-party plugins", async () => {
		vi.doMock(THIRD_PARTY_PACKAGE, () => ({
			widget: {
				__plugin: "widget",
				cli: {
					name: "widget",
					label: "Widget",
					package: THIRD_PARTY_PACKAGE,
					after: [],
					callbacks: {},
					commands: {},
					register: () => {},
				},
				events: {},
			},
		}));

		const { api } = await import("@fcalell/plugin-api");

		const config = defineConfig({
			app: { name: "app", domain: "example.com" },
			plugins: [
				api(),
				{
					__plugin: "widget" as const,
					__package: THIRD_PARTY_PACKAGE,
					options: {},
				},
			],
		});

		const discovered = await discoverPlugins(config);
		const names = discovered.map((p) => p.name);
		expect(names).toContain("api");
		expect(names).toContain("widget");

		vi.doUnmock(THIRD_PARTY_PACKAGE);
	});
});
