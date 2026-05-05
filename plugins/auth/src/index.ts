import { callback, plugin, slot } from "@fcalell/cli";
import type { TsExpression } from "@fcalell/cli/ast";
import { literalToProps } from "@fcalell/cli/ast";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { PluginRuntimeEntry } from "@fcalell/plugin-api";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import type { z } from "zod";
import { type AuthOptions, authOptionsSchema } from "./types";

// Post-validation view: every schema default is materialised. Threaded into
// `plugin()` as the 5th generic so `self.options` is the resolved shape.
type ResolvedAuthOptions = z.output<typeof authOptionsSchema>;

const SOURCE = "auth";

// Canonical path for the consumer's auth callback file. Auto-scaffolded by
// the plugin builder from `templates/callbacks.ts` when callbacks are
// declared, so this is the single place to keep path + existence checks
// in sync. Exposed on `auth.slots.callbackFile` so advanced consumers can
// override without string drift.
const CALLBACK_FILE = "src/worker/plugins/auth.ts";

// Local-dev hostnames that should trigger `sameSite=none` and count as a
// "frontend-present dev origin" for APP_URL derivation. Matched against
// `new URL(origin).hostname` — note that `URL` preserves IPv6 brackets on
// `.hostname` ("[::1]" not "::1"), so we list the bracketed form too.
const LOCAL_HOSTNAMES = new Set([
	"localhost",
	"127.0.0.1",
	"[::1]",
	"::1",
	"0.0.0.0",
]);

function isLocalOrigin(origin: string): boolean {
	try {
		const { hostname } = new URL(origin);
		if (LOCAL_HOSTNAMES.has(hostname)) return true;
		// Covers `*.localhost` (RFC 6761 reserved), `*.localdomain`
		// (common on Linux /etc/hosts), and `localhost.localdomain`.
		if (hostname.endsWith(".localhost")) return true;
		if (hostname.endsWith(".localdomain")) return true;
		if (hostname === "localhost.localdomain") return true;
		return false;
	} catch {
		return false;
	}
}

// ── Slot declarations ──────────────────────────────────────────────
//
// `runtimeOptions` is a DERIVED slot: its inputs include `api.slots.cors`,
// so the graph guarantees every cors contribution (including vite's
// localhost origin) is resolved BEFORE this compute runs. Bug #5 (auth
// cors ordering) is structurally impossible here — no payload to mutate,
// no handler ordering, just dataflow.

const runtimeOptions = slot.derived<
	Record<string, TsExpression>,
	{ cors: typeof api.slots.cors }
>({
	source: SOURCE,
	name: "runtimeOptions",
	inputs: { cors: api.slots.cors },
	compute: (inp, ctx) => {
		// Bug #1: empty-CORS contract. Better Auth silently treats
		// `undefined` trustedOrigins as "allow nothing" on some paths and
		// "fall back to baseURL" on others — both are footguns. Refuse to
		// generate instead of emitting an ambiguous runtime; the error
		// enumerates every way the consumer can supply origins.
		if (inp.cors.length === 0) {
			throw new Error(
				"plugin-auth: cannot generate runtime — no trusted origins are available. " +
					"Better Auth requires at least one trusted origin for CSRF protection. " +
					"Fix by one of:\n" +
					"  • set `app.domain` in stack.config.ts (derives https://<domain> + https://app.<domain>)\n" +
					"  • set `app.origins: [...]` to supply the allow-list explicitly\n" +
					"  • add `vite()` to plugins for dev (contributes http://localhost:<port>)",
			);
		}

		// Seed with every consumer-supplied option (secretVar, appUrlVar,
		// cookies, session, user, organization). `literalToProps` produces a
		// Record<string, TsExpression> so we can splice in derived keys below
		// without re-literalising the whole object.
		//   • `callbacks` — owned by api.slots.callbacks and spliced in by
		//     api's codegen; a consumer passing it in options would collide.
		//   • `rateLimiter` — wrangler-binding config (limit/period are
		//     enforced by the binding itself); the runtime accesses it via
		//     env.RATE_LIMITER_*. Not part of AuthRuntimeInput.
		const rawOptions = { ...(ctx.options as Record<string, unknown>) };
		delete rawOptions.callbacks;
		delete rawOptions.rateLimiter;
		const props = literalToProps(rawOptions);

		// trustedOrigins: always emit an explicit array. Empty is
		// structurally impossible here (thrown above), so the consumer
		// sees exactly what Better Auth sees at runtime.
		props.trustedOrigins = {
			kind: "array",
			items: inp.cors.map((o) => ({ kind: "string", value: o })),
		};

		// Bug #2: Cross-origin localhost dev — browsers drop cookies
		// cross-origin without sameSite=none. Coverage comes from
		// `isLocalOrigin`, which parses hostname via `new URL` and checks
		// against the LOCAL_HOSTNAMES set plus `.localhost` / `.localdomain`
		// suffixes. Covers `127.0.0.1`, `[::1]`, `0.0.0.0`, `*.localhost`,
		// `*.localdomain`, and http/https alike — alias coverage is
		// structural, not regex-matched. The runtime pairs sameSite=none
		// with secure=true automatically.
		if (inp.cors.some(isLocalOrigin)) {
			props.sameSite = { kind: "string", value: "none" };
		}

		return props;
	},
});

// Bug #3: canonical dev URL for `APP_URL`'s devDefault. Pre-fix it was
// hardcoded to "http://localhost:3000" — wrong for API-only apps (no
// frontend at all), wrong when vite's port is customised. This derived
// slot reads `api.slots.cors`: the first local origin wins when a
// frontend plugin is present, otherwise we fall back to the production
// domain. Plugin-auth never imports plugin-vite — the handoff is
// entirely through the shared `api.slots.cors` contract.
const appUrlDevDefault = slot.derived<string, { cors: typeof api.slots.cors }>({
	source: SOURCE,
	name: "appUrlDevDefault",
	inputs: { cors: api.slots.cors },
	compute: (inp, ctx) => {
		const local = inp.cors.find(isLocalOrigin);
		if (local) return local;
		// Worker-only / API-only: no frontend, no localhost contribution.
		// Prod domain is the right baseline for `.dev.vars` — Wrangler will
		// still let the consumer override per-environment.
		return `https://${ctx.app.domain}`;
	},
});

// Resolvable callback-file location. Value slot with a seed default;
// consumers who restructure the worker layout can override via
// `override: true` without the wiring silently breaking.
const callbackFile = slot.value<string>({
	source: SOURCE,
	name: "callbackFile",
	seed: () => CALLBACK_FILE,
});

export const auth = plugin<
	"auth",
	AuthOptions,
	{
		runtimeOptions: typeof runtimeOptions;
		appUrlDevDefault: typeof appUrlDevDefault;
		callbackFile: typeof callbackFile;
	},
	{
		sendOTP: ReturnType<typeof callback<{ email: string; code: string }>>;
		sendInvitation: ReturnType<
			typeof callback.optional<{ email: string; orgName: string }>
		>;
	},
	ResolvedAuthOptions
>("auth", {
	label: "Auth",

	schema: authOptionsSchema,

	requires: ["api", "cloudflare", "db"],

	callbacks: {
		sendOTP: callback<{ email: string; code: string }>(),
		sendInvitation: callback.optional<{ email: string; orgName: string }>(),
	},

	dependencies: {
		"@fcalell/plugin-auth": "workspace:*",
	},

	slots: {
		runtimeOptions,
		appUrlDevDefault,
		callbackFile,
	},

	contributes: (self) => [
		// Init prompts: cookie prefix + optional organization feature toggle.
		cliSlots.initPrompts.contribute(() => ({
			plugin: "auth",
			ask: async (rawCtx) => {
				// ContributionCtx carries `prompt` in its CLI shape (the ask
				// function is invoked by command code with the real ctx). We
				// cast narrowly to read prompt without widening the public
				// PromptSpec surface.
				const c = rawCtx as {
					prompt: {
						text: (msg: string, opts?: { default?: string }) => Promise<string>;
						confirm: (msg: string) => Promise<boolean>;
					};
				};
				const prefix = await c.prompt.text("Cookie prefix:", {
					default: "app",
				});
				const organization = await c.prompt.confirm("Include organizations?");
				return {
					cookies: { prefix },
					organization,
				};
			},
		})),

		// Rate limiter bindings for IP + email.
		cloudflare.slots.bindings.contribute(() => [
			{
				kind: "rate_limiter" as const,
				binding: self.options.rateLimiter.ip.binding,
				simple: {
					limit: self.options.rateLimiter.ip.limit,
					period: self.options.rateLimiter.ip.period,
				},
			},
			{
				kind: "rate_limiter" as const,
				binding: self.options.rateLimiter.email.binding,
				simple: {
					limit: self.options.rateLimiter.email.limit,
					period: self.options.rateLimiter.email.period,
				},
			},
		]),

		// Secrets: AUTH_SECRET + APP_URL (consumer-renameable via options).
		// APP_URL's devDefault comes from `appUrlDevDefault` — first
		// localhost cors contribution (frontend-present) or prod domain
		// fallback (worker-only). Never hardcoded to port 3000.
		cloudflare.slots.secrets.contribute(async (ctx) => {
			const devAppUrl = await ctx.resolve(self.slots.appUrlDevDefault);
			return [
				{ name: self.options.secretVar, devDefault: "dev-secret-change-me" },
				{ name: self.options.appUrlVar, devDefault: devAppUrl },
			];
		}),

		// Worker runtime entry. Resolves `runtimeOptions` inside the
		// contribution — the graph guarantees cors is fully-resolved before
		// the derivation runs, so the emitted call carries baked-in
		// trustedOrigins / sameSite values.
		api.slots.pluginRuntimes.contribute(
			async (ctx): Promise<PluginRuntimeEntry> => {
				const options = await ctx.resolve(self.slots.runtimeOptions);
				return {
					plugin: "auth",
					import: {
						source: "@fcalell/plugin-auth/runtime",
						default: "authRuntime",
					},
					identifier: "authRuntime",
					options,
				};
			},
		),

		// Callbacks: wire the consumer's callback file onto the auth runtime
		// entry. The plugin declares a REQUIRED `sendOTP` callback, so a
		// missing file is a misconfiguration, not an optional skip —
		// throwing here beats generating a worker that would crash on the
		// first request. Path is resolved via `auth.slots.callbackFile` so
		// consumers who restructure the repo can point at a new location.
		api.slots.callbacks.contribute(async (ctx) => {
			const path = await ctx.resolve(self.slots.callbackFile);
			const exists = await ctx.fileExists(path);
			if (!exists) {
				throw new Error(
					`plugin-auth: callback file \`${path}\` is missing. ` +
						"plugin-auth declares a required `sendOTP` callback that must be " +
						"implemented by the consumer. Run `stack init` / `stack add auth` " +
						"to scaffold the file, or restore it from your templates.",
				);
			}
			// Strip the `src/` prefix when computing the import source —
			// generated worker sits at `.stack/worker.ts` and imports
			// relative to itself. Consumers overriding `callbackFile` MUST
			// keep the file under `src/` — enforced below.
			if (!path.startsWith("src/")) {
				throw new Error(
					`plugin-auth: \`auth.slots.callbackFile\` must live under \`src/\` ` +
						`(got \`${path}\`). The generated worker imports callbacks relative ` +
						`to \`.stack/worker.ts\` and cannot reach paths outside \`src/\`.`,
				);
			}
			const importSource = `../${path.replace(/\.tsx?$/, "")}`;
			return {
				auth: {
					import: {
						source: importSource,
						default: "authCallbacks",
					},
					identifier: "authCallbacks",
				},
			};
		}),
	],
});

export type { AuthOptions } from "./types";
