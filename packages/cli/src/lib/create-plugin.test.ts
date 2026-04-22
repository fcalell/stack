import { describe, expect, it } from "vitest";
import { z } from "zod";
import { cliSlots } from "#lib/cli-slots";
import { callback, plugin } from "#lib/create-plugin";
import { validateDependencies } from "#lib/discovery";
import { StackError } from "#lib/errors";
import { slot } from "#lib/slots";

const app = { name: "test-app", domain: "example.com" };

describe("plugin() — config factory", () => {
	it("returns a callable that produces PluginConfig", () => {
		const myPlugin = plugin("test", {
			label: "Test",
		});

		const config = myPlugin({ value: 42 });
		expect(config.__plugin).toBe("test");
		expect(config.options).toEqual({ value: 42 });
	});

	it("validates via the provided schema", () => {
		const myPlugin = plugin("test", {
			label: "Test",
			schema: z.object({
				port: z
					.number()
					.refine((p) => p > 0, { error: "Port must be positive" }),
			}),
		});

		expect(() => myPlugin({ port: -1 })).toThrow("Port must be positive");
		expect(myPlugin({ port: 3000 }).options.port).toBe(3000);
	});

	it("surfaces Zod errors as StackError(PLUGIN_CONFIG_INVALID)", () => {
		const myPlugin = plugin("test", {
			label: "Test",
			schema: z.object({ port: z.number() }),
		});

		try {
			myPlugin({ port: "not-a-number" as unknown as number });
			expect.fail("should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(StackError);
			if (err instanceof StackError) {
				expect(err.code).toBe("PLUGIN_CONFIG_INVALID");
				expect(err.message).toMatch(/port/);
			}
		}
	});

	it("can be called without arguments when the schema supplies defaults", () => {
		const myPlugin = plugin("test", {
			label: "Test",
			schema: z.object({ value: z.number().default(1) }),
		});

		const config = myPlugin();
		expect(config.__plugin).toBe("test");
		expect(config.options).toEqual({ value: 1 });
	});

	it("passes options through when no schema is defined", () => {
		const myPlugin = plugin("test", {
			label: "Test",
		});

		expect(myPlugin().options).toEqual({});
	});

	it("stamps __package with the default @fcalell/plugin-<name> when not set", () => {
		const myPlugin = plugin("db", {
			label: "Database",
		});

		const config = myPlugin();
		expect(config.__package).toBe("@fcalell/plugin-db");
		expect(myPlugin.cli.package).toBe("@fcalell/plugin-db");
	});

	it("honours an explicit `package` option for third-party plugins", () => {
		const myPlugin = plugin("widget", {
			label: "Widget",
			package: "@acme/stack-plugin-widget",
		});

		const config = myPlugin();
		expect(config.__package).toBe("@acme/stack-plugin-widget");
		expect(myPlugin.cli.package).toBe("@acme/stack-plugin-widget");
	});
});

describe("plugin().slots", () => {
	it("exposes declared slots on the factory", () => {
		const ready = slot.value<boolean>({
			source: "db",
			name: "ready",
			seed: () => true,
		});
		const myPlugin = plugin("db", {
			label: "Database",
			slots: { ready },
		});

		expect(myPlugin.slots.ready).toBe(ready);
		expect(myPlugin.slots.ready.source).toBe("db");
	});

	it("defaults slots to an empty object when none declared", () => {
		const myPlugin = plugin("test", { label: "Test" });
		expect(myPlugin.slots).toEqual({});
	});
});

describe("plugin().cli.collect", () => {
	it("returns the declared slots and contributions", () => {
		const schemaReady = slot.value<boolean>({
			source: "db",
			name: "schemaReady",
			seed: () => true,
		});
		const bindings = slot.list<{ name: string }>({
			source: "db",
			name: "bindings",
		});
		const myPlugin = plugin("db", {
			label: "Database",
			slots: { schemaReady, bindings },
			contributes: [bindings.contribute(() => ({ name: "DB_MAIN" }))],
		});

		const { slots, contributes } = myPlugin.cli.collect({ app, options: {} });
		expect(slots).toEqual({ schemaReady, bindings });
		// User contribution + no auto-contribs (no deps/devDeps/gitignore).
		expect(contributes).toHaveLength(1);
		expect(contributes[0]?.slot).toBe(bindings);
	});

	it("passes a `self` helper to a function-form contributes", () => {
		const own = slot.list<string>({ source: "me", name: "own" });
		const seenSlots: unknown[] = [];
		const myPlugin = plugin<"me", { port: number }, { own: typeof own }>("me", {
			label: "Me",
			slots: { own },
			contributes: (self) => {
				seenSlots.push(self.slots);
				return [self.slots.own.contribute(() => `p:${self.options.port}`)];
			},
		});

		const { contributes } = myPlugin.cli.collect({
			app,
			options: { port: 42 },
		});
		expect(seenSlots[0]).toEqual({ own });
		expect(contributes).toHaveLength(1);
	});

	it("auto-contributes `dependencies` to cliSlots.initDeps (and removeDeps)", async () => {
		const myPlugin = plugin("test", {
			label: "Test",
			dependencies: { "@some/pkg": "^1.0.0" },
		});

		const { contributes } = myPlugin.cli.collect({ app, options: {} });
		const initDepsContrib = contributes.find(
			(c) => c.slot.id === cliSlots.initDeps.id,
		);
		const removeDepsContrib = contributes.find(
			(c) => c.slot.id === cliSlots.removeDeps.id,
		);
		expect(initDepsContrib).toBeDefined();
		expect(removeDepsContrib).toBeDefined();
		if (!initDepsContrib) throw new Error("initDeps contribution missing");

		// The fn returns the concrete Record<string, string>.
		const fakeCtx = {} as Parameters<typeof initDepsContrib.fn>[0];
		const deps = await initDepsContrib.fn(fakeCtx);
		expect(deps).toEqual({ "@some/pkg": "^1.0.0" });
	});

	it("auto-contributes `devDependencies` to cliSlots.initDevDeps", async () => {
		const myPlugin = plugin("test", {
			label: "Test",
			devDependencies: { typescript: "^5.0.0" },
		});

		const { contributes } = myPlugin.cli.collect({ app, options: {} });
		const devContrib = contributes.find(
			(c) => c.slot.id === cliSlots.initDevDeps.id,
		);
		expect(devContrib).toBeDefined();
		const value = await devContrib?.fn(
			{} as Parameters<NonNullable<typeof devContrib>["fn"]>[0],
		);
		expect(value).toEqual({ typescript: "^5.0.0" });
	});

	it("auto-contributes `gitignore` to cliSlots.gitignore", async () => {
		const myPlugin = plugin("test", {
			label: "Test",
			gitignore: [".stack/", "*.log"],
		});

		const { contributes } = myPlugin.cli.collect({ app, options: {} });
		const giContrib = contributes.find(
			(c) => c.slot.id === cliSlots.gitignore.id,
		);
		expect(giContrib).toBeDefined();
		const value = await giContrib?.fn(
			{} as Parameters<NonNullable<typeof giContrib>["fn"]>[0],
		);
		expect(value).toEqual([".stack/", "*.log"]);
	});

	it("does not auto-add a callbacks scaffold when the plugin has no `./runtime` export", () => {
		// The test fixture plugins don't have their package.json available to
		// the current test workspace, so `hasRuntimeExport` is false. A plugin
		// with callbacks alone should still not add a scaffold contribution.
		const myPlugin = plugin("auth-lite", {
			label: "Auth Lite",
			callbacks: {
				sendOTP: callback<{ email: string; code: string }>(),
			},
		});

		const { contributes } = myPlugin.cli.collect({ app, options: {} });
		const scaffoldContrib = contributes.find(
			(c) => c.slot.id === cliSlots.initScaffolds.id,
		);
		expect(scaffoldContrib).toBeUndefined();
	});
});

describe("plugin().defineCallbacks", () => {
	it("is present when callbacks are defined", () => {
		const myPlugin = plugin("auth", {
			label: "Auth",
			callbacks: {
				sendOTP: callback<{ email: string; code: string }>(),
			},
		});

		expect(myPlugin.defineCallbacks).toBeDefined();
	});

	it("returns the implementation object unchanged", () => {
		const myPlugin = plugin("auth", {
			label: "Auth",
			callbacks: {
				sendOTP: callback<{ email: string; code: string }>(),
			},
		});

		const impl = {
			sendOTP: async (_payload: { email: string; code: string }) => {
				// no-op
			},
		};

		const result = myPlugin.defineCallbacks(impl);
		expect(result).toBe(impl);
	});

	it("is not present when no callbacks are defined", () => {
		const myPlugin = plugin("test", { label: "Test" });

		expect("defineCallbacks" in myPlugin).toBe(false);
	});
});

describe("plugin() + validateDependencies (via requires)", () => {
	it("validateDependencies throws when a plugin `requires` an absent sibling", () => {
		const authPlugin = plugin("auth", {
			label: "Auth",
			requires: ["db"],
		});

		expect(authPlugin.requires).toEqual(["db"]);
		expect(authPlugin.cli.requires).toEqual(["db"]);

		// Discovery-level validation: stamp a DiscoveredPlugin-shaped wrapper
		// onto the validator. The test asserts that `requires` (not the old
		// `after:` event graph) drives the missing-plugin error.
		expect(() =>
			validateDependencies([
				{
					name: "auth",
					cli: authPlugin.cli as unknown as Parameters<
						typeof validateDependencies
					>[0][number]["cli"],
					factory: authPlugin as unknown as Parameters<
						typeof validateDependencies
					>[0][number]["factory"],
					options: {},
				},
			]),
		).toThrow(/\[auth\] requires plugin 'db'/);
	});
});
