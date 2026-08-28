import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { log } from "@clack/prompts";
import { plugin, slot } from "@fcalell/cli";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { aggregateDevVars, aggregateWrangler } from "./node/codegen";
import {
	cloudflareOptionsSchema,
	DEFAULT_COMPATIBILITY_DATE,
	type WranglerBindingSpec,
	type WranglerRouteSpec,
	type WranglerSecretSpec,
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

const secrets = slot.list<WranglerSecretSpec>({
	source: SOURCE,
	name: "secrets",
});

const compatibilityFlags = slot.list<string>({
	source: SOURCE,
	name: "compatibilityFlags",
});

// Pinned to a plugin-shipped constant so wrangler.toml generation is
// deterministic from (config + plugin version), not today's wall clock.
// Seeding with `new Date()` broke generate-to-generate reproducibility across
// day boundaries (`wrangler types` output drifted between runs, CI caches
// invalidated for no reason). Consumers who want a
// newer date push a `cloudflare.slots.compatibilityDate` value with
// `override: true`.
const compatibilityDate = slot.value<string>({
	source: SOURCE,
	name: "compatibilityDate",
	seed: () => DEFAULT_COMPATIBILITY_DATE,
});

// Final wrangler.toml source. Pure derivation — no ordering dependency
// between contributions; the aggregator reads every input slot at once.
const wranglerToml = slot.derived({
	source: SOURCE,
	name: "wranglerToml",
	inputs: {
		bindings,
		routes,
		vars,
		secrets,
		compatibilityDate,
		compatibilityFlags,
	},
	compute: (inp, ctx): string => {
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
				compatibilityFlags: inp.compatibilityFlags,
			},
			name: ctx.app.name,
		});
	},
});

export const cloudflare = plugin("cloudflare", {
	label: "Cloudflare",

	schema: cloudflareOptionsSchema,

	devDependencies: {
		wrangler: "^4.98.0",
	},
	gitignore: [".wrangler"],

	slots: {
		bindings,
		routes,
		vars,
		secrets,
		compatibilityDate,
		compatibilityFlags,
		wranglerToml,
	},

	contributes: (self) => [
		// Emit `.stack/wrangler.toml` — the derived slot handles every
		// binding/route/var/secret contribution structurally.
		emitArtifact(".stack/wrangler.toml", self.slots.wranglerToml),

		// Emit `.dev.vars` unless the consumer already has one — but a
		// pre-existing file missing STACK_DEV still gets it appended, so
		// projects generated before STACK_DEV existed pick it up instead of
		// throttling forever in local dev. STACK_DEV never goes through the
		// `secrets` slot — it must never become a `wrangler secret put` deploy
		// prompt.
		cliSlots.artifactFiles.contribute(async (ctx) => {
			const stackDevLine =
				"# STACK_DEV marks local dev; never set in production.\nSTACK_DEV=1\n";
			const exists = await ctx.fileExists(".dev.vars");
			if (exists) {
				const existing = await ctx.readFile(".dev.vars");
				if (/^STACK_DEV=/m.test(existing)) return undefined;
				const separator = existing.endsWith("\n") ? "" : "\n";
				return {
					path: ".dev.vars",
					content: `${existing}${separator}${stackDevLine}`,
				};
			}
			const resolvedSecrets = await ctx.resolve(self.slots.secrets);
			const secretsContent = aggregateDevVars(resolvedSecrets) ?? "";
			return {
				path: ".dev.vars",
				content: `${stackDevLine}${secretsContent}`,
			};
		}),

		// Dev wrangler process — the worker target's local runtime. `--config`
		// points at the generated `.stack/wrangler.toml` (the consumer root has
		// no wrangler config), and `--persist-to .stack/dev` fixes the local D1
		// so schema pushes, seeds, and the running worker all share one
		// miniflare database.
		cliSlots.devProcesses.contribute(() => ({
			name: "wrangler",
			command: "npx",
			args: [
				"wrangler",
				"dev",
				"--config",
				".stack/wrangler.toml",
				"--port",
				"8787",
				"--persist-to",
				".stack/dev",
			],
			defaultPort: 8787,
			readyPattern: /Ready on/,
			color: "yellow",
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
	WranglerSecretSpec,
	WranglerSecretValidation,
} from "./types";
