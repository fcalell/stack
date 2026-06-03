import type { Slot } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import {
	buildGraph,
	type GraphCtxFactory,
	type GraphPlugin,
} from "@fcalell/cli/graph";
import type { ProcessExit } from "@fcalell/cli/specs";
import { api } from "@fcalell/plugin-api";
import { describe, expect, it } from "vitest";
import { vite } from "./index";
import { viteOptionsSchema } from "./types";

// ── Harness ────────────────────────────────────────────────────────

const app = { name: "test-app", domain: "example.com" };

const noopLog = {
	info: () => {},
	warn: () => {},
	success: () => {},
	error: () => {},
};

function makeCtxFactory(
	perPluginOptions: Record<string, unknown> = {},
	appOverride?: typeof app & { origins?: string[] },
): GraphCtxFactory {
	return {
		app: appOverride ?? app,
		cwd: "/tmp/test",
		log: noopLog,
		ctxForPlugin: (name) => ({
			options: perPluginOptions[name] ?? {},
			fileExists: async () => false,
			readFile: async () => "",
			template: (n) => new URL(`file:///tmp/templates/${name}/${n}`),
			scaffold: (n, target) => ({
				source: new URL(`file:///tmp/templates/${name}/${n}`),
				target,
				plugin: name,
			}),
		}),
	};
}

// Pull the api + vite plugins' collected slots/contributions into GraphPlugin
// entries — same production path the CLI walks.
function collectVitePlugins(
	extras: GraphPlugin[] = [],
	viteOpts: Parameters<typeof vite>[0] = {},
	apiOpts: Parameters<typeof api>[0] = {},
	optsPerPlugin: Record<string, unknown> = {},
	appOverride?: typeof app & { origins?: string[] },
): { plugins: GraphPlugin[]; ctxFactory: GraphCtxFactory } {
	const apiCollected = api.cli.collect({ app, options: apiOpts ?? {} });
	const viteCollected = vite.cli.collect({ app, options: viteOpts ?? {} });
	const apiPlugin: GraphPlugin = {
		name: "api",
		slots: apiCollected.slots as unknown as Record<string, Slot<unknown>>,
		contributes: apiCollected.contributes,
	};
	const vitePlugin: GraphPlugin = {
		name: "vite",
		slots: viteCollected.slots as unknown as Record<string, Slot<unknown>>,
		contributes: viteCollected.contributes,
	};
	const perPluginOptions: Record<string, unknown> = {
		api: apiOpts ?? {},
		vite: viteOpts ?? {},
		...optsPerPlugin,
	};
	return {
		plugins: [apiPlugin, vitePlugin, ...extras],
		ctxFactory: makeCtxFactory(perPluginOptions, appOverride),
	};
}

// ── Config factory ────────────────────────────────────────────────

describe("vite config factory", () => {
	it("returns PluginConfig with __plugin 'vite'", () => {
		const config = vite();
		expect(config.__plugin).toBe("vite");
	});

	it("accepts custom port", () => {
		const config = vite({ port: 4000 });
		expect(config.options.port).toBe(4000);
	});

	it("defaults to empty options", () => {
		const config = vite();
		expect(config.options).toEqual({});
	});
});

describe("vite.slots", () => {
	it("owns configImports, pluginCalls, resolveAliases, devServerPort, viteConfig", () => {
		expect(vite.slots.configImports.source).toBe("vite");
		expect(vite.slots.pluginCalls.source).toBe("vite");
		expect(vite.slots.resolveAliases.source).toBe("vite");
		expect(vite.slots.devServerPort.source).toBe("vite");
		expect(vite.slots.viteConfig.source).toBe("vite");
	});
});

describe("vite.slots.resolveAliases uniqueness", () => {
	it("rejects two contributions sharing the same `find` (would silently overwrite when emitted as a TS object literal)", async () => {
		const a: GraphPlugin = {
			name: "a",
			contributes: [
				vite.slots.resolveAliases.contribute(() => ({
					find: "@",
					replacement: "/srcA",
				})),
			],
		};
		const b: GraphPlugin = {
			name: "b",
			contributes: [
				vite.slots.resolveAliases.contribute(() => ({
					find: "@",
					replacement: "/srcB",
				})),
			],
		};
		const { plugins, ctxFactory } = collectVitePlugins([a, b]);
		const g = buildGraph(plugins, ctxFactory);
		await expect(g.resolve(vite.slots.resolveAliases)).rejects.toThrow(
			/resolveAliases.*duplicate key '@'/,
		);
	});

	it("permits multiple distinct `find` entries", async () => {
		const a: GraphPlugin = {
			name: "a",
			contributes: [
				vite.slots.resolveAliases.contribute(() => ({
					find: "@",
					replacement: "/src",
				})),
			],
		};
		const b: GraphPlugin = {
			name: "b",
			contributes: [
				vite.slots.resolveAliases.contribute(() => ({
					find: "~",
					replacement: "/root",
				})),
			],
		};
		const { plugins, ctxFactory } = collectVitePlugins([a, b]);
		const g = buildGraph(plugins, ctxFactory);
		const aliases = await g.resolve(vite.slots.resolveAliases);
		expect(aliases.map((x) => x.find).sort()).toEqual(["@", "~"]);
	});
});

// ── devServerPort ─────────────────────────────────────────────────

describe("vite.slots.devServerPort", () => {
	it("defaults to 3000", async () => {
		const { plugins, ctxFactory } = collectVitePlugins();
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(vite.slots.devServerPort)).toBe(3000);
	});

	it("honours options.port", async () => {
		const { plugins, ctxFactory } = collectVitePlugins([], { port: 4000 });
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(vite.slots.devServerPort)).toBe(4000);
	});
});

// ── localhost CORS contribution (bug #5) ──────────────────────────

describe("vite → api.slots.corsOrigins contribution", () => {
	it("adds localhost to api.slots.cors when app.origins is not set", async () => {
		const { plugins, ctxFactory } = collectVitePlugins();
		const g = buildGraph(plugins, ctxFactory);
		const cors = await g.resolve(api.slots.cors);
		expect(cors).toContain("http://localhost:3000");
	});

	it("uses the configured port for localhost", async () => {
		const { plugins, ctxFactory } = collectVitePlugins([], { port: 4000 });
		const g = buildGraph(plugins, ctxFactory);
		const cors = await g.resolve(api.slots.cors);
		expect(cors).toContain("http://localhost:4000");
	});

	it("does not contribute localhost when app.origins is set", async () => {
		const { plugins, ctxFactory } = collectVitePlugins(
			[],
			{},
			{},
			{},
			{ ...app, origins: ["https://only.example.com"] },
		);
		const g = buildGraph(plugins, ctxFactory);
		const cors = await g.resolve(api.slots.cors);
		expect(cors).not.toContain("http://localhost:3000");
	});

	// Regression: empty `app.origins: []` is a meaningful "lock the
	// allow-list to nothing" override. Truthiness checks (`if (origins)`)
	// silently slip the empty array through and append localhost — which
	// quietly breaks the consumer's intent. Predicate must be
	// `!== undefined`, mirroring plugin-api's `cors` derivation.
	it("does not contribute localhost when app.origins is the empty array", async () => {
		const { plugins, ctxFactory } = collectVitePlugins(
			[],
			{},
			{},
			{},
			{ ...app, origins: [] },
		);
		const g = buildGraph(plugins, ctxFactory);
		const cors = await g.resolve(api.slots.cors);
		expect(cors).toEqual([]);
		expect(cors).not.toContain("http://localhost:3000");
	});

	// Bug #5 order-independence: placing vite BEFORE or AFTER a sibling
	// `api.slots.corsOrigins` contributor must yield the same cors result.
	it("cors result is order-independent when another plugin also contributes to corsOrigins", async () => {
		const extra: GraphPlugin = {
			name: "other",
			contributes: [
				api.slots.corsOrigins.contribute(() => "https://other.example"),
			],
		};
		const apiCollected = api.cli.collect({ app, options: {} });
		const viteCollected = vite.cli.collect({ app, options: {} });
		const apiP: GraphPlugin = {
			name: "api",
			slots: apiCollected.slots as unknown as Record<string, Slot<unknown>>,
			contributes: apiCollected.contributes,
		};
		const viteP: GraphPlugin = {
			name: "vite",
			slots: viteCollected.slots as unknown as Record<string, Slot<unknown>>,
			contributes: viteCollected.contributes,
		};

		const forward = buildGraph([apiP, viteP, extra], makeCtxFactory());
		const reverse = buildGraph([apiP, extra, viteP], makeCtxFactory());
		const corsF = await forward.resolve(api.slots.cors);
		const corsR = await reverse.resolve(api.slots.cors);
		for (const cors of [corsF, corsR]) {
			expect(cors).toContain("http://localhost:3000");
			expect(cors).toContain("https://other.example");
		}
	});
});

// ── viteConfig ────────────────────────────────────────────────────

describe("vite.slots.viteConfig", () => {
	it("emits defineConfig + providersPlugin with own contributions", async () => {
		const { plugins, ctxFactory } = collectVitePlugins();
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(vite.slots.viteConfig);
		expect(src).not.toBeNull();
		if (!src) return;
		expect(src).toContain('import { defineConfig } from "vite"');
		expect(src).toContain(
			'import { providersPlugin } from "@fcalell/plugin-vite/preset"',
		);
		expect(src).toContain("providersPlugin()");
	});

	it("embeds the resolved devServerPort in the config", async () => {
		const { plugins, ctxFactory } = collectVitePlugins([], { port: 4321 });
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(vite.slots.viteConfig);
		expect(src).toContain("port: 4321");
	});

	it("emits .stack/vite.config.ts into cliSlots.artifactFiles", async () => {
		const { plugins, ctxFactory } = collectVitePlugins();
		const g = buildGraph(plugins, ctxFactory);
		const files = await g.resolve(cliSlots.artifactFiles);
		expect(files.map((f) => f.path)).toContain(".stack/vite.config.ts");
	});
});

// ── dev + build ───────────────────────────────────────────────────

describe("vite dev + build contributions", () => {
	it("contributes a dev process with defaultPort matching the resolved port", async () => {
		const { plugins, ctxFactory } = collectVitePlugins([], { port: 4000 });
		const g = buildGraph(plugins, ctxFactory);
		const procs = await g.resolve(cliSlots.devProcesses);
		const v = procs.find((p) => p.name === "vite");
		expect(v).toBeTruthy();
		expect(v?.defaultPort).toBe(4000);
	});

	// The generated vite config is the single source of truth for the dev
	// server port. Passing --port on the CLI would silently shadow the
	// codegen value (Vite's CLI flag wins). Guard that by asserting the
	// process never receives --port / a numeric port arg.
	it("does not pass --port to the dev process (codegen is single source of truth)", async () => {
		const { plugins, ctxFactory } = collectVitePlugins([], { port: 4321 });
		const g = buildGraph(plugins, ctxFactory);
		const procs = await g.resolve(cliSlots.devProcesses);
		const v = procs.find((p) => p.name === "vite");
		expect(v).toBeTruthy();
		expect(v?.args).not.toContain("--port");
		expect(v?.args).not.toContain("4321");
	});

	it("defaults restart policy to 'never'", async () => {
		const { plugins, ctxFactory } = collectVitePlugins();
		const g = buildGraph(plugins, ctxFactory);
		const procs = await g.resolve(cliSlots.devProcesses);
		const v = procs.find((p) => p.name === "vite");
		expect(v?.restart).toBe("never");
	});

	it("honours options.restart + options.maxRestarts", async () => {
		const { plugins, ctxFactory } = collectVitePlugins([], {
			restart: "on-crash",
			maxRestarts: 5,
		});
		const g = buildGraph(plugins, ctxFactory);
		const procs = await g.resolve(cliSlots.devProcesses);
		const v = procs.find((p) => p.name === "vite");
		expect(v?.restart).toBe("on-crash");
		expect(v?.maxRestarts).toBe(5);
	});

	it("onExit surfaces a port-conflict next-step message when portInUse is true", async () => {
		const errors: string[] = [];
		const factory: GraphCtxFactory = {
			app,
			cwd: "/tmp/test",
			log: {
				info: () => {},
				warn: () => {},
				success: () => {},
				error: (msg) => {
					errors.push(msg);
				},
			},
			ctxForPlugin: (name) => ({
				options: name === "vite" ? { port: 4000 } : {},
				fileExists: async () => false,
				readFile: async () => "",
				template: (n) => new URL(`file:///tmp/templates/${name}/${n}`),
				scaffold: (n, target) => ({
					source: new URL(`file:///tmp/templates/${name}/${n}`),
					target,
					plugin: name,
				}),
			}),
		};
		const apiCollected = api.cli.collect({ app, options: {} });
		const viteCollected = vite.cli.collect({ app, options: { port: 4000 } });
		const apiP: GraphPlugin = {
			name: "api",
			slots: apiCollected.slots as unknown as Record<string, Slot<unknown>>,
			contributes: apiCollected.contributes,
		};
		const viteP: GraphPlugin = {
			name: "vite",
			slots: viteCollected.slots as unknown as Record<string, Slot<unknown>>,
			contributes: viteCollected.contributes,
		};
		const g = buildGraph([apiP, viteP], factory);
		const procs = await g.resolve(cliSlots.devProcesses);
		const v = procs.find((p) => p.name === "vite");
		expect(v?.onExit).toBeTypeOf("function");

		const exitEvent: ProcessExit = {
			code: 1,
			signal: null,
			restartAttempt: 0,
			portInUse: true,
			detectedPort: 4000,
			stderrTail: "EADDRINUSE",
		};
		v?.onExit?.(exitEvent);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain(":4000");
		expect(errors[0]).toContain("vite({ port:");
	});

	it("onExit is silent on non-port-conflict exits", async () => {
		const errors: string[] = [];
		const factory: GraphCtxFactory = {
			app,
			cwd: "/tmp/test",
			log: {
				info: () => {},
				warn: () => {},
				success: () => {},
				error: (msg) => {
					errors.push(msg);
				},
			},
			ctxForPlugin: () => ({
				options: {},
				fileExists: async () => false,
				readFile: async () => "",
				template: (n) => new URL(`file:///tmp/templates/${n}`),
				scaffold: (n, target) => ({
					source: new URL(`file:///tmp/templates/${n}`),
					target,
					plugin: "vite",
				}),
			}),
		};
		const apiCollected = api.cli.collect({ app, options: {} });
		const viteCollected = vite.cli.collect({ app, options: {} });
		const g = buildGraph(
			[
				{
					name: "api",
					slots: apiCollected.slots as unknown as Record<string, Slot<unknown>>,
					contributes: apiCollected.contributes,
				},
				{
					name: "vite",
					slots: viteCollected.slots as unknown as Record<
						string,
						Slot<unknown>
					>,
					contributes: viteCollected.contributes,
				},
			],
			factory,
		);
		const procs = await g.resolve(cliSlots.devProcesses);
		const v = procs.find((p) => p.name === "vite");
		v?.onExit?.({
			code: 1,
			signal: null,
			restartAttempt: 0,
			portInUse: false,
			detectedPort: null,
			stderrTail: "some unrelated crash",
		});
		expect(errors).toHaveLength(0);
	});

	it("contributes a build step via cliSlots.buildSteps", async () => {
		const { plugins, ctxFactory } = collectVitePlugins();
		const g = buildGraph(plugins, ctxFactory);
		const steps = await g.resolve(cliSlots.buildSteps);
		expect(steps.find((s) => s.name === "vite-build")).toBeTruthy();
	});
});

// ── Schema validation ─────────────────────────────────────────────

describe("viteOptionsSchema", () => {
	it("rejects port 0", () => {
		expect(() => viteOptionsSchema.parse({ port: 0 })).toThrow();
	});

	it("rejects negative port", () => {
		expect(() => viteOptionsSchema.parse({ port: -1 })).toThrow();
	});

	it("rejects port > 65535", () => {
		expect(() => viteOptionsSchema.parse({ port: 70000 })).toThrow();
	});

	it("rejects non-integer port", () => {
		expect(() => viteOptionsSchema.parse({ port: 3000.5 })).toThrow();
	});

	it("accepts port 1 and 65535 (range edges)", () => {
		expect(viteOptionsSchema.parse({ port: 1 }).port).toBe(1);
		expect(viteOptionsSchema.parse({ port: 65535 }).port).toBe(65535);
	});

	it("accepts known restart policies and rejects unknown ones", () => {
		expect(viteOptionsSchema.parse({ restart: "never" }).restart).toBe("never");
		expect(viteOptionsSchema.parse({ restart: "on-crash" }).restart).toBe(
			"on-crash",
		);
		expect(viteOptionsSchema.parse({ restart: "always" }).restart).toBe(
			"always",
		);
		expect(() => viteOptionsSchema.parse({ restart: "sometimes" })).toThrow();
	});
});

// ── viteConfig null-when-empty regression ─────────────────────────

describe("vite.slots.viteConfig (no contributions)", () => {
	// When every contribution is filtered out (the plugin's own preset
	// import + plugin call still land normally — this regression test
	// stands up an isolated graph that holds vite's slots WITHOUT vite's
	// own self-contributions, simulating a bare "no plugins call into
	// vite" topology). The derived slot must return null so emitArtifact
	// skips writing `.stack/vite.config.ts` entirely.
	it("returns null when no imports or plugin calls contribute", async () => {
		const viteCollected = vite.cli.collect({ app, options: {} });
		const slots = viteCollected.slots as unknown as Record<
			string,
			Slot<unknown>
		>;
		// Bare plugin entry — keep the slots so derivations resolve, drop
		// every contribution so configImports + pluginCalls land empty.
		const bareVite: GraphPlugin = {
			name: "vite",
			slots,
			contributes: [],
		};
		const factory = makeCtxFactory({ vite: {} });
		const g = buildGraph([bareVite], factory);
		const src = await g.resolve(vite.slots.viteConfig);
		expect(src).toBeNull();
	});

	it("does not emit .stack/vite.config.ts when viteConfig is null", async () => {
		const viteCollected = vite.cli.collect({ app, options: {} });
		const slots = viteCollected.slots as unknown as Record<
			string,
			Slot<unknown>
		>;
		// Keep the cliSlots.artifactFiles contribution (emitArtifact) but
		// drop the configImports/pluginCalls self-contributions so the
		// source resolves to null and the artifact is skipped.
		const artifactOnlyVite: GraphPlugin = {
			name: "vite",
			slots,
			contributes: viteCollected.contributes.filter(
				(c) => c.slot.source === "cli" && c.slot.name === "artifactFiles",
			),
		};
		const factory = makeCtxFactory({ vite: {} });
		const g = buildGraph([artifactOnlyVite], factory);
		const files = await g.resolve(cliSlots.artifactFiles);
		expect(files.map((f) => f.path)).not.toContain(".stack/vite.config.ts");
	});
});

// ── devServerPort override propagates to CORS (regression) ─────────

describe("vite.slots.devServerPort override propagates to CORS", () => {
	// Bug regression: the api.slots.corsOrigins contribution must read the
	// resolved devServerPort slot, not options.port. A sibling plugin that
	// overrides vite.slots.devServerPort must propagate to the CORS list.
	it("a sibling overriding devServerPort updates the localhost CORS entry", async () => {
		const overrider: GraphPlugin = {
			name: "port-overrider",
			contributes: [vite.slots.devServerPort.contribute(() => 5555)],
		};
		const apiCollected = api.cli.collect({ app, options: {} });
		const viteCollected = vite.cli.collect({ app, options: { port: 3000 } });
		const apiP: GraphPlugin = {
			name: "api",
			slots: apiCollected.slots as unknown as Record<string, Slot<unknown>>,
			contributes: apiCollected.contributes,
		};
		const viteP: GraphPlugin = {
			name: "vite",
			slots: viteCollected.slots as unknown as Record<string, Slot<unknown>>,
			contributes: viteCollected.contributes,
		};
		const g = buildGraph(
			[apiP, viteP, overrider],
			makeCtxFactory({ vite: { port: 3000 } }),
		);

		// Sanity: the override wins over the seed.
		expect(await g.resolve(vite.slots.devServerPort)).toBe(5555);

		// Regression: CORS reflects the override, not options.port (3000).
		const cors = await g.resolve(api.slots.cors);
		expect(cors).toContain("http://localhost:5555");
		expect(cors).not.toContain("http://localhost:3000");
	});
});
