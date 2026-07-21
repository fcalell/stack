import { plugin, slot } from "@fcalell/cli";
import type { TsExpression, TsImportSpec } from "@fcalell/cli/ast";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { api } from "@fcalell/plugin-api";
import { aggregateViteConfig } from "./node/codegen.ts";
import {
	type ServerProxyEntry,
	type ViteOptions,
	viteOptionsSchema,
} from "./types.ts";

const SOURCE = "vite";

// ── Slot declarations ──────────────────────────────────────────────

// Sort config imports by source so the emitted vite.config.ts order is
// independent of `config.plugins` array order.
const configImports = slot.list<TsImportSpec>({
	source: SOURCE,
	name: "configImports",
	sortBy: (a, b) => a.source.localeCompare(b.source),
});

// Order of plugin calls in Vite typically doesn't matter semantically for
// the plugins contributed today (solid, tailwind, theme fonts, providers).
// Sort by call callee identifier name so the emitted array is deterministic.
function pluginCallName(expr: TsExpression): string {
	if (expr.kind === "call" && expr.callee.kind === "identifier") {
		return expr.callee.name;
	}
	return "";
}
const pluginCalls = slot.list<TsExpression>({
	source: SOURCE,
	name: "pluginCalls",
	sortBy: (a, b) => pluginCallName(a).localeCompare(pluginCallName(b)),
});

const resolveAliases = slot.list<{ find: string; replacement: string }>({
	source: SOURCE,
	name: "resolveAliases",
	// `find` is the key in the emitted Vite `resolve.alias` object; two
	// contributions with the same `find` would silently overwrite when the
	// TS object literal is rendered. Fail loudly at compose time instead.
	uniqueBy: (a) => a.find,
});

// Bare specifiers rendered into `resolve.dedupe`. A plugin whose runtime must
// be a singleton (solid-js and friends) contributes its specifiers here so
// every importer — the consumer's own code and workspace-linked plugin
// checkouts alike — resolves the one copy under the consumer's root. Two
// plugins naming the same specifier is harmless (the codegen de-duplicates),
// so no uniqueBy.
const resolveDedupe = slot.list<string>({
	source: SOURCE,
	name: "resolveDedupe",
	sortBy: (a, b) => a.localeCompare(b),
});

// Resolved dev-server port. Defaults to 3000; overrideable via options.port.
const devServerPort = slot.value<number, ViteOptions>({
	source: SOURCE,
	name: "devServerPort",
	seed: (ctx) => {
		return ctx.options.port ?? 3000;
	},
});

// Dev-server proxy rules, rendered into the generated config's
// `server.proxy`. Deploy-target plugins contribute their worker-owned
// paths here so the browser stays same-origin in dev exactly like prod.
const serverProxy = slot.list<ServerProxyEntry>({
	source: SOURCE,
	name: "serverProxy",
	sortBy: (a, b) => a.path.localeCompare(b.path),
	// `path` is the key in the emitted `server.proxy` object; duplicates
	// would silently overwrite when rendered. Fail loudly at compose time.
	uniqueBy: (e) => e.path,
});

// Extra dev-server `server.fs.allow` path expressions. A plugin that serves
// assets out of its own package (fonts, icons) contributes the expression
// resolving its real location, so a workspace-linked stack checkout still
// serves them in dev (Vite 403s paths outside the consumer's workspace root).
const fsAllow = slot.list<TsExpression>({
	source: SOURCE,
	name: "fsAllow",
});

// Rendered `.stack/vite.config.ts` source. Pulled into `cli.slots.artifactFiles`
// by the contribution below — gated on at least one plugin call or import
// so a vite-less config never writes an empty file.
const viteConfig = slot.derived({
	source: SOURCE,
	name: "viteConfig",
	inputs: {
		imports: configImports,
		plugins: pluginCalls,
		aliases: resolveAliases,
		dedupe: resolveDedupe,
		port: devServerPort,
		proxy: serverProxy,
		fsAllow,
	},
	compute: (inp): string | null => {
		if (inp.plugins.length === 0 && inp.imports.length === 0) return null;
		return aggregateViteConfig({
			imports: inp.imports,
			pluginCalls: inp.plugins,
			resolveAliases: inp.aliases,
			resolveDedupe: inp.dedupe,
			devServerPort: inp.port,
			serverProxy: inp.proxy,
			fsAllow: inp.fsAllow,
		});
	},
});

export const vite = plugin("vite", {
	label: "Vite",

	schema: viteOptionsSchema,

	slots: {
		configImports,
		pluginCalls,
		resolveAliases,
		resolveDedupe,
		devServerPort,
		serverProxy,
		fsAllow,
		viteConfig,
	},

	contributes: (self) => [
		// Framework preset — the providers virtual module plugin.
		self.slots.configImports.contribute(
			(): TsImportSpec => ({
				source: "@fcalell/plugin-vite/preset",
				named: ["providersPlugin"],
			}),
		),
		self.slots.pluginCalls.contribute(
			(): TsExpression => ({
				kind: "call",
				callee: { kind: "identifier", name: "providersPlugin" },
				args: [],
			}),
		),

		// Contribute the dev-server localhost origin to CORS unless the
		// consumer has overridden `app.origins` entirely. Reads
		// `vite.slots.devServerPort` via ctx.resolve so the value follows
		// options.port if the consumer bumps it.
		//
		// Predicate: `!== undefined`, NOT truthiness. `app.origins: []` is a
		// meaningful "no origins" override the consumer might use to lock the
		// CORS allow-list down — silently appending localhost would defeat
		// it. Mirror plugin-api's `cors` derivation (same predicate) so every
		// reader of `app.origins` agrees on the override semantics.
		api.slots.corsOrigins.contribute(async (ctx) => {
			if (ctx.app.origins !== undefined) return undefined;
			const port = await ctx.resolve(self.slots.devServerPort);
			return `http://localhost:${port}`;
		}),

		// Emit `.stack/vite.config.ts` via cli.slots.artifactFiles. Null source
		// (empty pluginCalls + empty imports) skips the write.
		emitArtifact(".stack/vite.config.ts", self.slots.viteConfig),

		// Dev process. The generated `.stack/vite.config.ts` is the single
		// source of truth for the dev port — passing `--port` here would let
		// the CLI flag silently shadow the codegen value. Instead we pass
		// `defaultPort` for the supervisor to introspect (logging,
		// `EADDRINUSE` classification fallback) and provide an `onExit` hook
		// that surfaces a clear next-step message on port collisions.
		cliSlots.devProcesses.contribute(async (ctx) => {
			const port = await ctx.resolve(self.slots.devServerPort);
			const opts = self.options;
			return {
				name: "vite",
				command: "npx",
				args: ["vite", "dev", "--config", ".stack/vite.config.ts"],
				defaultPort: port,
				readyPattern: /Local:/,
				color: "cyan",
				// Default `restart: "never"` — Vite handles HMR; auto-restart
				// on crash usually hides the real failure. Consumer can opt in.
				restart: opts.restart ?? "never",
				maxRestarts: opts.maxRestarts,
				// Use the supervisor's default EADDRINUSE pattern. Explicitly
				// returns `undefined` rather than relying on implicit-void
				// because `() => void` isn't assignable to the spec's
				// `() => { restart: boolean } | undefined` under strict TS.
				onExit: (event) => {
					if (!event.portInUse) return undefined;
					const detected = event.detectedPort ?? port;
					ctx.log.error(
						`vite dev: port :${detected} is in use — set \`vite({ port: ... })\` in stack.config.ts or stop the process holding it.`,
					);
					return undefined;
				},
			};
		}),

		// Build step. No --outDir: the generated config's
		// `build.outDir: "../dist/client"` is the single source of truth; a
		// relative CLI flag would resolve against config.root (.stack) and
		// silently move the output to .stack/dist/client.
		cliSlots.buildSteps.contribute(() => ({
			name: "vite-build",
			phase: "main",
			exec: {
				command: "npx",
				args: ["vite", "build", "--config", ".stack/vite.config.ts"],
			},
		})),
	],
});

export type { ServerProxyEntry, ViteOptions } from "./types.ts";
