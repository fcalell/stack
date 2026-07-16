import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ContributionCtx } from "@fcalell/cli";
import { plugin, slot } from "@fcalell/cli";
import type {
	MiddlewareSpec,
	TsExpression,
	TsImportSpec,
} from "@fcalell/cli/ast";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { z } from "zod";
import { generateRouteBarrel, hasRoutableFiles } from "./node/barrel";
import { aggregateMiddleware, aggregateWorker } from "./node/codegen";
import { aggregateProcedure } from "./node/procedure-codegen";
import {
	type CallbackSpec,
	type PluginRuntimeEntry,
	ROUTES_BARREL_IMPORT_SOURCE,
	type WorkerPayload,
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
const middlewareCalls = slot.derived({
	source: SOURCE,
	name: "middlewareCalls",
	inputs: { entries: middlewareEntries },
	compute: (inp): TsExpression[] =>
		aggregateMiddleware({ entries: inp.entries }).calls,
});

// Derived view of middleware imports (deduplicated).
const middlewareImports = slot.derived({
	source: SOURCE,
	name: "middlewareImports",
	inputs: { entries: middlewareEntries },
	compute: (inp): TsImportSpec[] =>
		aggregateMiddleware({ entries: inp.entries }).imports,
});

// The handler is a value slot — api seeds it conditionally on whether the
// consumer has at least one routable file under `src/worker/routes`. Other
// plugins may override via `override: true` if they own the root handler
// shape.
//
// Why "routable file" and not "directory exists": the worker imports from
// `../src/worker/routes` (resolves to the generated `index.ts` barrel). If
// the barrel skips emission (no routes), the import would dangle. Gate the
// handler on the same predicate so handler + barrel + import are wired (or
// not) together.
const routesHandler = slot.value<{ identifier: string } | null>({
	source: SOURCE,
	name: "routesHandler",
	seed: (ctx) => (hasRoutableFiles(ctx.cwd) ? { identifier: "routes" } : null),
});

// Free-form extra CORS origins contributed by frontend plugins (e.g. vite's
// localhost). Users override the CORS allow-list entirely via
// `app.origins` — see `cors` below.
const corsOrigins = slot.list<string>({
	source: SOURCE,
	name: "corsOrigins",
});

// URL prefixes the worker owns. Deploy-target plugins read this to route
// requests to the worker (a Node server mounts these paths on the worker
// fetch handler; a proxy forwards them) without reaching into api's
// options. api contributes its own `prefix`; a plugin that mounts extra
// worker-owned paths (e.g. auth's /api/auth) contributes them here too.
const routePrefixes = slot.list<string>({
	source: SOURCE,
	name: "routePrefixes",
	sortBy: (a, b) => a.localeCompare(b),
});

// The final CORS list peer plugins actually read.
//
// Override contract: `app.origins` is *present, even when empty* = override
// verbatim; *absent* = derive defaults from `app.domain` and append any
// extras contributed to `corsOrigins`. The check is `!== undefined`
// deliberately — `[]` is a valid (and meaningful) override that the runtime
// catches as a misconfiguration. Using truthiness (`if (origins)`) silently
// swallows the empty-array case because `Boolean([]) === true`, but the
// semantic must be explicit so future readers don't reintroduce a JS coercion
// quirk as load-bearing behavior.
//
// Wildcard guard: mixing `"*"` with specific origins has undefined semantics
// in the CORS spec (and across browser implementations). We refuse the mix at
// codegen time so the failure is loud and traceable, not a runtime surprise.
const cors = slot.derived({
	source: SOURCE,
	name: "cors",
	inputs: { extras: corsOrigins },
	compute: (inp, ctx): string[] => {
		const result =
			ctx.app.origins !== undefined
				? ctx.app.origins
				: [
						`https://${ctx.app.domain}`,
						`https://app.${ctx.app.domain}`,
						...inp.extras,
					];
		const hasWildcard = result.includes("*");
		const hasSpecific = result.some((o) => o !== "*");
		if (hasWildcard && hasSpecific) {
			throw new Error(
				`api.cors: "*" mixed with specific origins (${result
					.filter((o) => o !== "*")
					.join(
						", ",
					)}); wildcard semantics are undefined when combined with explicit origins.`,
			);
		}
		return result;
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
const workerBase = slot.derived({
	source: SOURCE,
	name: "workerBase",
	inputs: { cors },
	compute: (inp, ctx: ContributionCtx<ApiOptions>): TsExpression => {
		const options = ctx.options;
		const properties: Array<{ key: string; value: TsExpression }> = [];
		if (options.prefix) {
			properties.push({
				key: "prefix",
				value: { kind: "string", value: options.prefix },
			});
		}
		// Always emit cors — preserving an empty `[]` when the consumer
		// explicitly opted out via `app.origins: []`. The runtime decides
		// what to do (throw on empty, apply on non-empty); silently dropping
		// an empty cors here would turn the override into a no-op.
		properties.push({
			key: "cors",
			value: {
				kind: "array",
				items: inp.cors.map((o) => ({ kind: "string", value: o })),
			},
		});
		return {
			kind: "call",
			callee: { kind: "identifier", name: "createWorker" },
			args: properties.length > 0 ? [{ kind: "object", properties }] : [],
		};
	},
});

// RBAC action statements for `procedure({ rbac: [...] })` / `procedure({ can:
// [...] })`'s type-level autocomplete, handed over by plugin-auth (its
// `organization.ac.statements` — plain JSON, resource -> allowed actions)
// when organization access control is configured. `null` (the seed) means no
// plugin contributed one; `.stack/procedure.ts` falls back to
// `Record<never, never>`, which resolves `Rbac<...>`/`Can<...>` to `never` —
// both options become un-settable rather than accepting an arbitrary string
// that would TypeError at request time (no organization plugin means no
// `hasPermission` to check against).
// `override: true` because only one plugin's statements can be authoritative
// — auth is the only first-party contributor today.
const rbacStatements = slot.value<Record<string, readonly string[]> | null>({
	source: SOURCE,
	name: "rbacStatements",
	override: true,
	seed: () => null,
});

// Entity vocabulary for `procedure({ reads, writes })`'s type-level
// autocomplete (WS3.1) — a UNION across every
// plugin that owns a set of entity names: plugin-db contributes the
// consumer's Drizzle schema table export names, plugin-auth contributes its
// own runtime-owned tables (`account`/`session`/`user`/`verification`, plus
// `invitation`/`member`/`organization` when `organization` is enabled) so
// `procedure({ reads: ["member"] })` (e.g. auth's own `orgRules` procedure)
// type-checks and participates in cache invalidation without the consumer
// re-declaring auth's tables. `uniqueBy` fails loudly on a genuine name
// collision between two contributors instead of silently letting one
// shadow the other — mirrors `vite.slots.resolveAliases`. Empty list
// (nothing contributed) falls back to `Entity = string` in
// `.stack/procedure.ts` (reads/writes still work, just without narrowing).
const entities = slot.list<string>({
	source: SOURCE,
	name: "entities",
	sortBy: (a, b) => a.localeCompare(b),
	uniqueBy: (e) => e,
});

// The rendered `src/worker/routes/index.ts` barrel. Returns null when
// there's nothing to barrel (no routes dir, or routes dir contains no
// routable files). emitArtifact below skips the write on null — without
// this gate the generator would emit a header-only stub into the
// consumer's working tree on every `stack generate`, even for worker-only
// / no-routes projects. Has no slot inputs because it reads `ctx.cwd`
// directly via `generateRouteBarrel` / `hasRoutableFiles` — the routes
// directory is part of the consumer's source tree, not slot data.
const routeBarrelSource = slot.derived({
	source: SOURCE,
	name: "routeBarrelSource",
	compute: (_inp, ctx): string | null => {
		if (!hasRoutableFiles(ctx.cwd)) return null;
		return generateRouteBarrel(ctx.cwd);
	},
});

// The rendered `.stack/worker.ts` source. Pulled into `cli.slots.artifactFiles`
// by the auto-contribution below, gated on the worker having anything to
// run: at least one plugin runtime or at least one consumer route.
const workerSource = slot.derived({
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
	compute: (inp): string | null => {
		// No runtimes AND no routes — nothing would actually run. Return null
		// so the file-emission contribution skips writing a hollow worker.
		// Routes alone are a real worker (a routes-only consumer with no
		// db/auth still serves its procedures).
		if (inp.runtimes.length === 0 && inp.handler === null) return null;

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

// The rendered `.stack/procedure.ts` source — the `virtual:stack-procedure`
// target a consumer's `src/worker/routes/*.ts` imports (mapped via a
// tsconfig `paths` alias; see `packages/cli/src/templates/tsconfig.ts`).
// Gated the same way `workerSource` is: no runtimes and no routes, no
// artifact. This is the ONLY place that gate is checked —
// `aggregateProcedure` itself is ungated (it would happily render a
// runtimes-less chain); the slot compute is the natural place to decide
// whether the artifact exists at all.
//
// Mirrors `middlewareCalls`/`middlewareImports` alongside `pluginRuntimes` so
// the rebuilt `__chain` in `.stack/procedure.ts` extends `TContext` exactly
// the way the real worker's chain does — see `node/procedure-codegen.ts`.
const procedureSource = slot.derived({
	source: SOURCE,
	name: "procedureSource",
	inputs: {
		base: workerBase,
		runtimes: pluginRuntimes,
		imports: workerImports,
		middlewareCalls,
		middlewareImports,
		statements: rbacStatements,
		entities,
		handler: routesHandler,
	},
	compute: (inp): string | null => {
		if (inp.runtimes.length === 0 && inp.handler === null) return null;
		return aggregateProcedure({
			base: inp.base,
			runtimes: inp.runtimes,
			imports: inp.imports,
			middlewareChain: inp.middlewareCalls,
			middlewareImports: inp.middlewareImports,
			statements: inp.statements,
			entities: inp.entities,
		});
	},
});

export const api = plugin("api", {
	label: "API",

	schema: apiOptionsSchema,

	dependencies: {
		"@fcalell/plugin-api": "workspace:*",
	},
	gitignore: [".stack"],

	slots: {
		workerImports,
		pluginRuntimes,
		middlewareEntries,
		middlewareCalls,
		middlewareImports,
		routesHandler,
		corsOrigins,
		routePrefixes,
		cors,
		callbacks,
		workerBase,
		workerSource,
		routeBarrelSource,
		rbacStatements,
		entities,
		procedureSource,
	},

	contributes: (self) => [
		// The oRPC prefix is a worker-owned URL space; deploy targets read
		// routePrefixes to mount or forward it.
		self.slots.routePrefixes.contribute(() => self.options.prefix),
		// Always import `createWorker` — the base call uses it verbatim.
		self.slots.workerImports.contribute(
			(): TsImportSpec => ({
				source: "@fcalell/plugin-api/runtime",
				default: "createWorker",
			}),
		),

		// Routes namespace import — single source of truth is the
		// `routesHandler` slot. The seed there decides whether the consumer has
		// a routes directory; the import contribution simply mirrors that
		// decision. A naive `await ctx.fileExists(...)` here would race the
		// seed if the filesystem ever returned different answers between the
		// two reads, emitting either an import without a `.handler(routes)` call
		// or a handler call without its import. Resolving the slot guarantees
		// internal consistency by construction.
		self.slots.workerImports.contribute(async (ctx) => {
			const handler = await ctx.resolve(self.slots.routesHandler);
			if (!handler) return undefined;
			return {
				source: ROUTES_BARREL_IMPORT_SOURCE,
				namespace: handler.identifier,
			};
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

		// Dedicated blanket per-IP volume limiter for the whole /rpc tree (see
		// `worker/index.ts`'s `RATE_LIMITER_RPC` constant). A fixed volume
		// ceiling, not a consumer option: 1000 req/60s per IP is far above any
		// legitimate single client but low enough to catch a runaway retry loop
		// or scraper, and sized so a shared carrier-NAT IP (mobile networks,
		// corporate proxies) never trips it. Kept structurally separate from
		// plugin-auth's RATE_LIMITER_IP/RATE_LIMITER_EMAIL bindings and from any
		// procedure's own `rateLimit: "ip"` middleware so none of them share —
		// and none of them halve — another's budget.
		cloudflare.slots.bindings.contribute(() => ({
			kind: "rate_limiter" as const,
			binding: "RATE_LIMITER_RPC",
			simple: { limit: 1000, period: 60 },
		})),

		// `virtual:stack-procedure` -> `.stack/procedure.ts` tsconfig `paths`
		// alias. Consumed by `stack init`'s tsconfig template (never by `stack
		// generate` — tsconfig.json is scaffolded once). Own presence is the
		// gate: no runtimes means no `.stack/procedure.ts` either, but the alias
		// is harmless to declare in that case (it just never resolves).
		cliSlots.tsconfigPaths.contribute(() => ({
			"virtual:stack-procedure": ["./.stack/procedure.ts"],
		})),

		// Emit the rendered worker file into cli.slots.artifactFiles. Null
		// source (no runtimes in the config) skips the emission.
		emitArtifact(".stack/worker.ts", self.slots.workerSource),

		// Emit the `virtual:stack-procedure` target — the consumer-facing
		// `procedure` factory route files import. Same null-skip gate as
		// workerSource (no runtimes, no artifact).
		emitArtifact(".stack/procedure.ts", self.slots.procedureSource),

		// Emit the route barrel via the universal source-slot pattern. The
		// source returns null when there are no routable files, in which
		// case emitArtifact skips the write — no more header-only stub
		// landing in worker-only / no-routes consumer trees on every
		// generate. routesHandler shares the same `hasRoutableFiles`
		// predicate so import + handler + barrel agree on emission.
		emitArtifact("src/worker/routes/index.ts", self.slots.routeBarrelSource),

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

		// Remove: clean the routes directory on `stack remove api`.
		cliSlots.removeFiles.contribute(() => "src/worker/routes/"),
	],
});

export { ApiError } from "./error";
export type { CallbackSpec, PluginRuntimeEntry } from "./node/types";
export type { Middleware } from "./procedure";
export type { InferRouter } from "./types";
