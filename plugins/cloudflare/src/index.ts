import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { log } from "@clack/prompts";
import { plugin, slot } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { aggregateDevVars, aggregateWrangler } from "./node/codegen";
import {
	type CloudflareOptions,
	cloudflareOptionsSchema,
	type WranglerBindingSpec,
	type WranglerRouteSpec,
} from "./types";

const SOURCE = "cloudflare";

// ── Slot declarations ──────────────────────────────────────────────
//
// Plugins that need cloudflare bindings / secrets / vars contribute directly
// into these list/map slots; `wranglerToml` is a derived slot that composes
// them into the final `.stack/wrangler.toml` source.

const bindings = slot.list<WranglerBindingSpec>({
	source: SOURCE,
	name: "bindings",
});

const routes = slot.list<WranglerRouteSpec>({
	source: SOURCE,
	name: "routes",
});

const vars = slot.map<string>({
	source: SOURCE,
	name: "vars",
});

const secrets = slot.list<{ name: string; devDefault: string }>({
	source: SOURCE,
	name: "secrets",
});

// Default: today's date. Worker compat dates bump rarely; consumers can
// override via a `value` override:true contribution if needed.
const compatibilityDate = slot.value<string>({
	source: SOURCE,
	name: "compatibilityDate",
	seed: () => new Date().toISOString().split("T")[0] ?? "",
});

// Final wrangler.toml source. Pure derivation — no ordering dependency
// between contributions; the aggregator reads every input slot at once.
const wranglerToml = slot.derived<
	string,
	{
		bindings: typeof bindings;
		routes: typeof routes;
		vars: typeof vars;
		secrets: typeof secrets;
		compatibilityDate: typeof compatibilityDate;
	}
>({
	source: SOURCE,
	name: "wranglerToml",
	inputs: {
		bindings,
		routes,
		vars,
		secrets,
		compatibilityDate,
	},
	compute: (inp, ctx) => {
		const consumerWranglerPath = join(ctx.cwd, "wrangler.toml");
		const consumerWrangler = existsSync(consumerWranglerPath)
			? readFileSync(consumerWranglerPath, "utf-8")
			: null;
		return aggregateWrangler({
			consumerWrangler,
			payload: {
				bindings: inp.bindings,
				routes: inp.routes,
				vars: inp.vars,
				secrets: inp.secrets,
				compatibilityDate: inp.compatibilityDate,
			},
			name: ctx.app.name,
		});
	},
});

export const cloudflare = plugin<
	"cloudflare",
	CloudflareOptions,
	{
		bindings: typeof bindings;
		routes: typeof routes;
		vars: typeof vars;
		secrets: typeof secrets;
		compatibilityDate: typeof compatibilityDate;
		wranglerToml: typeof wranglerToml;
	}
>("cloudflare", {
	label: "Cloudflare",

	schema: cloudflareOptionsSchema,

	slots: {
		bindings,
		routes,
		vars,
		secrets,
		compatibilityDate,
		wranglerToml,
	},

	contributes: (self) => [
		// Emit `.stack/wrangler.toml` — the derived slot handles every
		// binding/route/var/secret contribution structurally.
		cliSlots.artifactFiles.contribute(async (ctx) => {
			const content = await ctx.resolve(self.slots.wranglerToml);
			return { path: ".stack/wrangler.toml", content };
		}),

		// Emit `.dev.vars` from contributed secrets when there are any and the
		// consumer hasn't already written one. Mirrors the behaviour of the
		// old Generate handler.
		cliSlots.artifactFiles.contribute(async (ctx) => {
			const resolvedSecrets = await ctx.resolve(self.slots.secrets);
			const content = aggregateDevVars(resolvedSecrets);
			if (content === null) return undefined;
			if (existsSync(join(ctx.cwd, ".dev.vars"))) return undefined;
			return { path: ".dev.vars", content };
		}),

		// After `.stack/wrangler.toml` is on disk, shell out to `wrangler
		// types` to regenerate Env typings. Failures are non-fatal.
		cliSlots.postWrite.contribute((ctx) => async () => {
			const result = spawnSync(
				"npx",
				[
					"wrangler",
					"types",
					".stack/worker-configuration.d.ts",
					"-c",
					".stack/wrangler.toml",
				],
				{ cwd: ctx.cwd, stdio: "pipe" },
			);
			if (result.status !== 0) {
				const stderr = result.stderr?.toString().trim() ?? "";
				log.warn(
					`wrangler types failed (Env typings may be stale)${stderr ? `: ${stderr}` : ""}`,
				);
			}
		}),
	],
});

export type {
	CloudflareOptions,
	CodegenWranglerPayload,
	WranglerBindingSpec,
	WranglerRouteSpec,
} from "./types";
