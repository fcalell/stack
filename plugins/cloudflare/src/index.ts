import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { log } from "@clack/prompts";
import { plugin, slot } from "@fcalell/cli";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { aggregateDevVars, aggregateWrangler } from "./node/codegen";
import {
	type CloudflareOptions,
	cloudflareOptionsSchema,
	DEFAULT_COMPATIBILITY_DATE,
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

// Pinned to a plugin-shipped constant so wrangler.toml generation is
// deterministic from (config + plugin version), not today's wall clock.
// Seeding with `new Date()` broke generate-to-generate reproducibility across
// day boundaries (snapshot tests flaked, `wrangler types` output drifted
// between runs, CI caches invalidated for no reason). Consumers who want a
// newer date push a `cloudflare.slots.compatibilityDate` value with
// `override: true`.
const compatibilityDate = slot.value<string>({
	source: SOURCE,
	name: "compatibilityDate",
	seed: () => DEFAULT_COMPATIBILITY_DATE,
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
		emitArtifact(".stack/wrangler.toml", self.slots.wranglerToml),

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

		// After `.stack/wrangler.toml` is on disk, shell out to `wrangler types`
		// to regenerate Env typings. Non-fatal by design: a missing binary or a
		// wrangler crash downgrades to a warning with actionable next steps —
		// the rest of `stack generate` still completes.
		//
		// On every failure path we delete any pre-existing
		// `.stack/worker-configuration.d.ts`. Leaving a stale d.ts in place is
		// the worst outcome — the consumer's typecheck silently passes against
		// last-run's bindings while the real `env.*` shape has drifted. Removing
		// it forces an immediate "Cannot find name 'Env'" error that points at
		// the failed regen, instead of a phantom green typecheck.
		cliSlots.postWrite.contribute((ctx) => async () => {
			const dtsPath = join(ctx.cwd, ".stack/worker-configuration.d.ts");
			const removeStaleDts = () => {
				try {
					rmSync(dtsPath, { force: true });
				} catch {
					/* best-effort — surfacing the wrangler error is the priority */
				}
			};

			let result: ReturnType<typeof spawnSync>;
			try {
				result = spawnSync(
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
			} catch (err) {
				removeStaleDts();
				const detail = err instanceof Error ? err.message : String(err);
				log.warn(
					`wrangler types could not run (Env typings removed to surface the failure): ${detail}. ` +
						"Install wrangler (e.g. `pnpm add -D wrangler`) and re-run `stack generate`.",
				);
				return;
			}
			if (result.error) {
				removeStaleDts();
				const err = result.error as NodeJS.ErrnoException;
				const hint =
					err.code === "ENOENT"
						? "npx not found on PATH; install Node.js or wrangler and re-run `stack generate`."
						: err.message;
				log.warn(
					`wrangler types could not run (Env typings removed to surface the failure): ${hint}`,
				);
				return;
			}
			if (result.status !== 0) {
				removeStaleDts();
				const stderr = result.stderr?.toString().trim() ?? "";
				log.warn(
					`wrangler types failed (Env typings removed to surface the failure)${stderr ? `: ${stderr}` : ""}. ` +
						"Run `pnpm exec wrangler types .stack/worker-configuration.d.ts -c .stack/wrangler.toml` manually to see the full error.",
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
