import { plugin, slot } from "@fcalell/cli";
import type { TsExpression, TsImportSpec } from "@fcalell/cli/ast";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { api } from "@fcalell/plugin-api";
import { aggregateViteConfig } from "./node/codegen";
import { type ViteOptions, viteOptionsSchema } from "./types";

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
});

// Resolved dev-server port. Defaults to 3000; overrideable via options.port.
const devServerPort = slot.value<number>({
	source: SOURCE,
	name: "devServerPort",
	seed: (ctx) => {
		const opts = (ctx.options ?? {}) as ViteOptions;
		return opts.port ?? 3000;
	},
});

// Rendered `.stack/vite.config.ts` source. Pulled into `cli.slots.artifactFiles`
// by the contribution below — gated on at least one plugin call or import
// so a vite-less config never writes an empty file.
const viteConfig = slot.derived<
	string | null,
	{
		imports: typeof configImports;
		plugins: typeof pluginCalls;
		aliases: typeof resolveAliases;
		port: typeof devServerPort;
	}
>({
	source: SOURCE,
	name: "viteConfig",
	inputs: {
		imports: configImports,
		plugins: pluginCalls,
		aliases: resolveAliases,
		port: devServerPort,
	},
	compute: (inp) => {
		if (inp.plugins.length === 0 && inp.imports.length === 0) return null;
		return aggregateViteConfig({
			imports: inp.imports,
			pluginCalls: inp.plugins,
			resolveAliases: inp.aliases,
			devServerPort: inp.port,
		});
	},
});

export const vite = plugin<
	"vite",
	ViteOptions,
	{
		configImports: typeof configImports;
		pluginCalls: typeof pluginCalls;
		resolveAliases: typeof resolveAliases;
		devServerPort: typeof devServerPort;
		viteConfig: typeof viteConfig;
	}
>("vite", {
	label: "Vite",

	schema: viteOptionsSchema,

	slots: {
		configImports,
		pluginCalls,
		resolveAliases,
		devServerPort,
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
		api.slots.corsOrigins.contribute(async (ctx) => {
			if (ctx.app.origins) return undefined;
			const port = await ctx.resolve(self.slots.devServerPort);
			return `http://localhost:${port}`;
		}),

		// Emit `.stack/vite.config.ts` via cli.slots.artifactFiles. Null source
		// (empty pluginCalls + empty imports) skips the write.
		cliSlots.artifactFiles.contribute(async (ctx) => {
			const src = await ctx.resolve(self.slots.viteConfig);
			if (src === null) return undefined;
			return { path: ".stack/vite.config.ts", content: src };
		}),

		// Dev process.
		cliSlots.devProcesses.contribute(async (ctx) => {
			const port = await ctx.resolve(self.slots.devServerPort);
			return {
				name: "vite",
				command: "npx",
				args: [
					"vite",
					"dev",
					"--config",
					".stack/vite.config.ts",
					"--port",
					String(port),
				],
				readyPattern: /Local:/,
				color: "cyan",
			};
		}),

		// Build step.
		cliSlots.buildSteps.contribute(() => ({
			name: "vite-build",
			phase: "main",
			exec: {
				command: "npx",
				args: [
					"vite",
					"build",
					"--config",
					".stack/vite.config.ts",
					"--outDir",
					"dist/client",
				],
			},
		})),
	],
});

export type { ViteOptions } from "./types";
