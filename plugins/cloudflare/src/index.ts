import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { log } from "@clack/prompts";
import { type ContributionCtx, plugin, slot } from "@fcalell/cli";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { api } from "@fcalell/plugin-api";
import { vite } from "@fcalell/plugin-vite";
import { aggregateDevVars, aggregateWrangler } from "./node/codegen.ts";
import {
	cloudflareOptionsSchema,
	DEFAULT_COMPATIBILITY_DATE,
	type WranglerBindingSpec,
	type WranglerRouteSpec,
} from "./types.ts";

const SOURCE = "cloudflare";

// `wrangler dev`'s listen port, passed explicitly so the dev process and the
// worker's dev origin agree.
const WRANGLER_DEV_PORT = 8787;

// Where miniflare keeps the local worker's state (D1, KV, caches, traces):
// wrangler's own `.wrangler/state`, at the consumer root. plugin-db's local
// D1 commands pass the same `--persist-to`.
export const LOCAL_PERSIST = ".wrangler/state";

// ── Slot declarations ──────────────────────────────────────────────
//
// Plugins that need cloudflare bindings / vars contribute directly into
// these list/map slots; `wranglerToml` is a derived slot that composes them,
// with the worker's `api.slots.env` declarations, into the final
// `.stack/wrangler.toml` source.

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
		env: api.slots.env,
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
				secrets: inp.env,
				compatibilityDate: inp.compatibilityDate,
				compatibilityFlags: inp.compatibilityFlags,
			},
			name: ctx.app.name,
		});
	},
});

// The config and tsconfig every bundling wrangler command reads. The consumer
// root has no wrangler config, so `--config` names the generated one. esbuild
// reads the tsconfig nearest each file unless told otherwise, which under the
// split is the solution `tsconfig.json` with no `paths`, so
// `virtual:stack-procedure` would not resolve: `--tsconfig` names the one
// holding them. It is absolute because wrangler hands it to esbuild, which
// resolves a relative one against the config's directory, `.stack/`, and the
// config file's own `tsconfig` key fails the same way.
async function wranglerConfigArgs(ctx: ContributionCtx): Promise<string[]> {
	const tsconfig = await ctx.resolve(cliSlots.workerTsconfig);
	return [
		"--config",
		".stack/wrangler.toml",
		"--tsconfig",
		join(ctx.cwd, tsconfig),
	];
}

export const cloudflare = plugin("cloudflare", {
	label: "Cloudflare",

	schema: cloudflareOptionsSchema,

	devDependencies: {
		wrangler: "^4.98.0",
	},
	gitignore: [".wrangler"],

	guide: [
		{
			page: "wrangler",
			trigger:
				"Editing the root `wrangler.toml` or `.dev.vars`, adding a binding or route, or typing `Env`",
		},
		{ page: "deploy", trigger: "Deploying the app to Cloudflare" },
	],

	slots: {
		bindings,
		routes,
		vars,
		compatibilityDate,
		compatibilityFlags,
		wranglerToml,
	},

	contributes: (self) => [
		// Emit `.stack/wrangler.toml` — the derived slot handles every
		// binding/route/var/env contribution structurally.
		emitArtifact(".stack/wrangler.toml", self.slots.wranglerToml),

		// Dedicated blanket per-IP volume limiter for the api worker's whole
		// /rpc tree; the name is plugin-api's `RATE_LIMITER_RPC` runtime
		// constant. A fixed volume ceiling, not a consumer option: 1000 req/60s
		// per IP is far above any legitimate single client but low enough to
		// catch a runaway retry loop or scraper, and sized so a shared
		// carrier-NAT IP (mobile networks, corporate proxies) never trips it.
		// Kept structurally separate from plugin-auth's
		// RATE_LIMITER_IP/RATE_LIMITER_EMAIL bindings and from any procedure's
		// own `rateLimit: "ip"` middleware so none of them share — and none of
		// them halve — another's budget. A deploy with no worker-owned paths
		// (no api) has no /rpc tree to limit.
		self.slots.bindings.contribute(async (ctx) => {
			if ((await ctx.resolve(api.slots.routePrefixes)).length === 0) {
				return undefined;
			}
			return {
				kind: "rate_limiter" as const,
				binding: "RATE_LIMITER_RPC",
				simple: { limit: 1000, period: 60 },
			};
		}),

		// Emit `.dev.vars` unless the consumer already has one; an existing
		// file is topped up with STACK_DEV and every declared var it lacks, at
		// its dev default, so a var declared after the file was written still
		// reaches the dev worker, and `wrangler types` (which types a var in
		// `.dev.vars` as `string`, one only in `[vars]` as its literal `""`)
		// types it as a string. STACK_DEV never goes through `api.slots.env` —
		// it must never become a `wrangler secret put` deploy prompt.
		//
		// wrangler resolves `.dev.vars` relative to its config file, and the
		// dev process runs `--config .stack/wrangler.toml`, so the consumer's
		// root file is invisible to it. The root file stays the consumer's
		// editing surface; every generate mirrors it into `.stack/.dev.vars`
		// for wrangler to read.
		cliSlots.artifactFiles.contribute(async (ctx) => {
			const stackDevLine =
				"# STACK_DEV marks local dev; never set in production.\nSTACK_DEV=1\n";
			const env = await ctx.resolve(api.slots.env);
			const files: Array<{ path: string; content: string }> = [];
			let content: string;
			if (await ctx.fileExists(".dev.vars")) {
				const existing = await ctx.readFile(".dev.vars");
				const declared = (name: string) =>
					new RegExp(`^${name}=`, "m").test(existing);
				const missing = `${declared("STACK_DEV") ? "" : stackDevLine}${
					aggregateDevVars(env.filter((e) => !declared(e.name))) ?? ""
				}`;
				content = existing;
				if (missing) {
					const separator =
						existing === "" || existing.endsWith("\n") ? "" : "\n";
					content = `${existing}${separator}${missing}`;
					files.push({ path: ".dev.vars", content });
				}
			} else {
				content = `${stackDevLine}${aggregateDevVars(env) ?? ""}`;
				files.push({ path: ".dev.vars", content });
			}
			files.push({
				path: ".stack/.dev.vars",
				content: `# Generated mirror of ../.dev.vars — edit that file, then re-run stack generate.\n${content}`,
			});
			return files;
		}),

		// The worker's own dev origin: with no frontend plugin it is the only
		// one, so APP_URL's dev default and the dev trusted origins derive
		// from it. `app.origins` overrides the dev list too, as it does for
		// vite and expo. It rides the deploy-target list, so a frontend's
		// origin always comes first.
		api.slots.devTargetOrigins.contribute((ctx) =>
			ctx.app.origins !== undefined
				? undefined
				: `http://localhost:${WRANGLER_DEV_PORT}`,
		),

		// Same-origin dev: the vite dev server proxies worker-owned paths to
		// `wrangler dev`, so the RPC and auth clients' relative URLs reach the
		// worker and its session cookie is first-party. Inert without vite in
		// the config.
		vite.slots.serverProxy.contribute(async (ctx) => {
			const prefixes = await ctx.resolve(api.slots.routePrefixes);
			const target = `http://localhost:${WRANGLER_DEV_PORT}`;
			return prefixes.map((path) => ({ path, target }));
		}),

		// wrangler keeps its scratch `.wrangler/` beside its config, so the dev
		// bundle it rewrites on every worker edit lands in
		// `.stack/.wrangler/tmp/`, inside Vite's root. Tailwind's automatic
		// source detection scans that bundle and answers a change to a file it
		// scanned, but no module imports, with a full page reload; Vite's
		// watcher never sees the directory.
		vite.slots.watchIgnored.contribute(() => "**/.wrangler/**"),

		// Dev wrangler process — the worker target's local runtime. `--config`
		// points at the generated `.stack/wrangler.toml` (the consumer root has
		// no wrangler config), and `--persist-to` fixes the local D1 so schema
		// pushes, seeds, and the running worker all share one miniflare
		// database. The state lives outside `.stack/`, which is Vite's root:
		// every request writes it, and each write Vite sees is a full reload.
		cliSlots.devProcesses.contribute(async (ctx) => ({
			name: "wrangler",
			command: "npx",
			args: [
				"wrangler",
				"dev",
				...(await wranglerConfigArgs(ctx)),
				"--port",
				String(WRANGLER_DEV_PORT),
				"--persist-to",
				LOCAL_PERSIST,
			],
			defaultPort: WRANGLER_DEV_PORT,
			readyPattern: /Ready on/,
			color: "yellow",
		})),

		// Deploy step: push the worker up via wrangler.
		cliSlots.deploySteps.contribute(async (ctx) => ({
			name: "Worker",
			phase: "main",
			exec: {
				command: "npx",
				args: ["wrangler", "deploy", ...(await wranglerConfigArgs(ctx))],
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
} from "./types.ts";
