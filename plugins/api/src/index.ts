import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { plugin, slot } from "@fcalell/cli";
import type {
	MiddlewareSpec,
	TsExpression,
	TsImportSpec,
} from "@fcalell/cli/ast";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { z } from "zod";
import { generateRouteBarrel } from "./node/barrel";
import { aggregateMiddleware, aggregateWorker } from "./node/codegen";
import type {
	CallbackSpec,
	PluginRuntimeEntry,
	WorkerPayload,
} from "./node/types";

export const apiOptionsSchema = z.object({
	prefix: z
		.string()
		.refine((p) => p.startsWith("/"), {
			error: "api: prefix must start with /",
		})
		.default("/rpc"),
});

export type ApiOptions = z.input<typeof apiOptionsSchema>;

// ── Slot declarations ──────────────────────────────────────────────
//
// Every worker fragment the plugin owns is a slot; peer plugins contribute
// into them by importing `api.slots.*` and calling `.contribute(fn)`. The
// final `.stack/worker.ts` comes out of the `workerSource` derivation, which
// structurally reads every other slot — no ordering between contributions to
// reason about.

const SOURCE = "api";

// Sort imports by source so the emitted worker file is independent of
// `config.plugins` array order. dedupeImports preserves insertion order
// within a group, so we sort the raw list first.
const workerImports = slot.list<TsImportSpec>({
	source: SOURCE,
	name: "workerImports",
	sortBy: (a, b) => a.source.localeCompare(b.source),
});

// Sort runtimes by plugin name so the generated `.use(...)` chain is
// deterministic regardless of `config.plugins` array order. Hono middleware
// order within pluginRuntimes is semantically independent — each runtime
// attaches its own `c.var.<plugin>` — so a stable sort gives order-invariant
// worker source without changing behavior.
const pluginRuntimes = slot.list<PluginRuntimeEntry>({
	source: SOURCE,
	name: "pluginRuntimes",
	sortBy: (a, b) => a.plugin.localeCompare(b.plugin),
});

const middlewareEntries = slot.list<MiddlewareSpec>({
	source: SOURCE,
	name: "middlewareEntries",
});

// Derived view of middleware: sorted call expressions.
const middlewareCalls = slot.derived<
	TsExpression[],
	{ entries: typeof middlewareEntries }
>({
	source: SOURCE,
	name: "middlewareCalls",
	inputs: { entries: middlewareEntries },
	compute: (inp) => aggregateMiddleware({ entries: inp.entries }).calls,
});

// Derived view of middleware imports (deduplicated).
const middlewareImports = slot.derived<
	TsImportSpec[],
	{ entries: typeof middlewareEntries }
>({
	source: SOURCE,
	name: "middlewareImports",
	inputs: { entries: middlewareEntries },
	compute: (inp) => aggregateMiddleware({ entries: inp.entries }).imports,
});

// The handler is a value slot — api seeds it conditionally on whether the
// consumer has a `src/worker/routes` directory. Other plugins may override
// via `override: true` if they own the root handler shape.
const routesHandler = slot.value<{ identifier: string } | null>({
	source: SOURCE,
	name: "routesHandler",
	seed: async (ctx) =>
		(await ctx.fileExists("src/worker/routes"))
			? { identifier: "routes" }
			: null,
});

// Free-form extra CORS origins contributed by frontend plugins (e.g. vite's
// localhost). Users override the CORS allow-list entirely via
// `app.origins` — see `cors` below.
const corsOrigins = slot.list<string>({
	source: SOURCE,
	name: "corsOrigins",
});

// The final CORS list peer plugins actually read. When the consumer supplies
// `app.origins` we honour it verbatim; otherwise we derive a default from the
// domain and append any extras from `corsOrigins`.
const cors = slot.derived<string[], { extras: typeof corsOrigins }>({
	source: SOURCE,
	name: "cors",
	inputs: { extras: corsOrigins },
	compute: (inp, ctx) => {
		if (ctx.app.origins) return ctx.app.origins;
		const base = [`https://${ctx.app.domain}`, `https://app.${ctx.app.domain}`];
		return [...base, ...inp.extras];
	},
});

// Callback files a peer plugin wants wired into its runtime entry. Key is
// the plugin name; must match `PluginRuntimeEntry.plugin`. The worker
// aggregator splices `callbacks: <identifier>` into the corresponding
// runtime's options object and imports the identifier.
const callbacks = slot.map<CallbackSpec>({
	source: SOURCE,
	name: "callbacks",
});

// The root builder call. Derived from cors + options so worker options
// (prefix / cors) are baked in purely from dataflow.
const workerBase = slot.derived<TsExpression, { cors: typeof cors }>({
	source: SOURCE,
	name: "workerBase",
	inputs: { cors },
	compute: (inp, ctx) => {
		const options = (ctx.options ?? {}) as ApiOptions;
		const properties: Array<{ key: string; value: TsExpression }> = [];
		if (options.prefix) {
			properties.push({
				key: "prefix",
				value: { kind: "string", value: options.prefix },
			});
		}
		if (inp.cors.length > 0) {
			properties.push({
				key: "cors",
				value: {
					kind: "array",
					items: inp.cors.map((o) => ({ kind: "string", value: o })),
				},
			});
		}
		return {
			kind: "call",
			callee: { kind: "identifier", name: "createWorker" },
			args: properties.length > 0 ? [{ kind: "object", properties }] : [],
		};
	},
});

// The rendered `.stack/worker.ts` source. Pulled into `cli.slots.artifactFiles`
// by the auto-contribution below, gated on `pluginRuntimes` being non-empty
// (with only the api plugin, no runtimes would land in the chain — emitting a
// hollow worker would be confusing).
const workerSource = slot.derived<
	string | null,
	{
		imports: typeof workerImports;
		base: typeof workerBase;
		runtimes: typeof pluginRuntimes;
		middlewareCalls: typeof middlewareCalls;
		middlewareImports: typeof middlewareImports;
		handler: typeof routesHandler;
		callbacks: typeof callbacks;
	}
>({
	source: SOURCE,
	name: "workerSource",
	inputs: {
		imports: workerImports,
		base: workerBase,
		runtimes: pluginRuntimes,
		middlewareCalls,
		middlewareImports,
		handler: routesHandler,
		callbacks,
	},
	compute: (inp) => {
		// With only plugin-api in the config, `pluginRuntimes` is empty — nothing
		// would actually run. Return null so the file-emission contribution
		// skips writing a hollow worker.
		if (inp.runtimes.length === 0) return null;

		const payload: WorkerPayload = {
			imports: [...inp.imports, ...inp.middlewareImports],
			base: inp.base,
			pluginRuntimes: inp.runtimes,
			middlewareChain: inp.middlewareCalls,
			handler: inp.handler,
			callbacks: inp.callbacks,
		};
		return aggregateWorker(payload);
	},
});

export const api = plugin<
	"api",
	ApiOptions,
	{
		workerImports: typeof workerImports;
		pluginRuntimes: typeof pluginRuntimes;
		middlewareEntries: typeof middlewareEntries;
		middlewareCalls: typeof middlewareCalls;
		middlewareImports: typeof middlewareImports;
		routesHandler: typeof routesHandler;
		corsOrigins: typeof corsOrigins;
		cors: typeof cors;
		callbacks: typeof callbacks;
		workerBase: typeof workerBase;
		workerSource: typeof workerSource;
	}
>("api", {
	label: "API",

	schema: apiOptionsSchema,

	dependencies: {
		"@fcalell/plugin-api": "workspace:*",
	},
	devDependencies: {
		wrangler: "^4.14.0",
	},
	gitignore: [".wrangler", ".stack"],

	slots: {
		workerImports,
		pluginRuntimes,
		middlewareEntries,
		middlewareCalls,
		middlewareImports,
		routesHandler,
		corsOrigins,
		cors,
		callbacks,
		workerBase,
		workerSource,
	},

	contributes: (self) => [
		// Always import `createWorker` — the base call uses it verbatim.
		self.slots.workerImports.contribute(
			(): TsImportSpec => ({
				source: "@fcalell/plugin-api/runtime",
				default: "createWorker",
			}),
		),

		// Routes namespace import, gated on the handler value slot's seed.
		self.slots.workerImports.contribute(async (ctx) => {
			const hasRoutes = await ctx.fileExists("src/worker/routes");
			if (!hasRoutes) return undefined;
			return { source: "../src/worker/routes", namespace: "routes" };
		}),

		// Consumer middleware is an implicit contribution via the conventional
		// file `src/worker/middleware.ts`. Published via `middlewareEntries` so
		// third-party plugins can interleave middleware around it.
		self.slots.middlewareEntries.contribute(async (ctx) => {
			const hasMiddleware = await ctx.fileExists("src/worker/middleware.ts");
			if (!hasMiddleware) return undefined;
			return {
				imports: [
					{
						source: "../src/worker/middleware",
						default: "middleware",
					},
				],
				call: { kind: "identifier", name: "middleware" },
				phase: "before-routes",
				order: 100,
			} as MiddlewareSpec;
		}),

		// Emit the rendered worker file into cli.slots.artifactFiles. Null
		// source (no runtimes in the config) skips the emission.
		cliSlots.artifactFiles.contribute(async (ctx) => {
			const src = await ctx.resolve(self.slots.workerSource);
			if (src === null) return undefined;
			return { path: ".stack/worker.ts", content: src };
		}),

		// Always regenerate the route barrel — cheap, order-independent.
		cliSlots.artifactFiles.contribute((ctx) => ({
			path: "src/worker/routes/index.ts",
			content: generateRouteBarrel(ctx.cwd),
		})),

		// Dev wrangler process.
		cliSlots.devProcesses.contribute(() => ({
			name: "api",
			command: "npx",
			args: ["wrangler", "dev", "--port", "8787", "--persist-to", ".stack/dev"],
			defaultPort: 8787,
			readyPattern: /Ready on/,
			color: "yellow",
		})),

		// Route watcher — regenerates the barrel when route files appear/disappear.
		cliSlots.devWatchers.contribute((ctx) => ({
			name: "routes",
			paths: "src/worker/routes/**",
			ignore: ["**/index.ts"],
			debounce: 300,
			async handler(_path, type) {
				if (type === "add" || type === "unlink") {
					const barrelContent = generateRouteBarrel(ctx.cwd);
					writeFileSync(
						join(ctx.cwd, "src/worker/routes/index.ts"),
						barrelContent,
					);
					ctx.log.info("Route barrel regenerated");
				}
			},
		})),

		// Deploy step: push the worker up via wrangler.
		cliSlots.deploySteps.contribute(() => ({
			name: "Worker",
			phase: "main",
			exec: {
				command: "npx",
				args: ["wrangler", "deploy", "--config", ".stack/wrangler.toml"],
			},
		})),

		// Remove: clean the routes directory on `stack remove api`.
		cliSlots.removeFiles.contribute(() => "src/worker/routes/"),
	],
});

export { ApiError } from "./error";
export type { CallbackSpec, PluginRuntimeEntry } from "./node/types";
export type { Middleware } from "./procedure";
export type { InferRouter } from "./types";
