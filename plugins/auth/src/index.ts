import type { ContributionCtx } from "@fcalell/cli";
import { callback, plugin, slot } from "@fcalell/cli";
import type { TsExpression } from "@fcalell/cli/ast";
import { literalToProps } from "@fcalell/cli/ast";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { PluginRuntimeEntry } from "@fcalell/plugin-api";
import { api } from "@fcalell/plugin-api";
import { isLocalOrigin } from "@fcalell/plugin-api/lib/local-origin";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { defaultOrgStatements, getStatements } from "./access";
import {
	AUTH_PREFIX,
	type AuthCallbackPayloads,
	authOptionsSchema,
	type ResolvedAuthOptions,
	resolveSocialProviders,
} from "./types";

const SOURCE = "auth";

// Canonical path for the consumer's auth callback file. Auto-scaffolded by
// the plugin builder from `templates/callbacks.ts` when callbacks are
// declared, so this is the single place to keep path + existence checks
// in sync. Exposed on `auth.slots.callbackFile` so advanced consumers can
// override without string drift.
const CALLBACK_FILE = "src/worker/plugins/auth.ts";

// ── Slot declarations ──────────────────────────────────────────────
//
// `runtimeOptions` is a DERIVED slot: its inputs are `api.slots.cors` and
// `api.slots.devCorsOrigins`, so the graph guarantees every origin
// contribution (including vite's localhost) is resolved BEFORE this compute
// runs. Bug #5 (auth cors ordering) is structurally impossible here — no
// payload to mutate, no handler ordering, just dataflow.

const runtimeOptions = slot.derived({
	source: SOURCE,
	name: "runtimeOptions",
	inputs: { cors: api.slots.cors, devCors: api.slots.devCorsOrigins },
	compute: (
		inp,
		ctx: ContributionCtx<ResolvedAuthOptions>,
	): Record<string, TsExpression> => {
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
					"  • set `app.origins: [...]` to supply the allow-list explicitly",
			);
		}

		// Seed with every consumer-supplied option (secretVar, appUrlVar,
		// cookies, session, user, organization). `literalToProps` produces a
		// Record<string, TsExpression> so we can splice in derived keys below
		// without re-literalising the whole object.
		//   • `callbacks` — owned by api.slots.callbacks and spliced in by
		//     api's codegen; a consumer passing it in options would collide.
		const rawOptions = { ...(ctx.options as Record<string, unknown>) };
		delete rawOptions.callbacks;
		// `rateLimiter` — replace the full options object (limit/period are
		// wrangler-binding config, enforced by the binding itself) with the
		// binding names only, so the runtime knows which env keys to read for
		// `_rateLimiter`. Schema defaults guarantee both are present.
		rawOptions.rateLimiter = {
			ip: { binding: ctx.options.rateLimiter.ip.binding },
			email: { binding: ctx.options.rateLimiter.email.binding },
		};
		// Bake resolved provider → env-var references (never the raw
		// `true`/object input). Only var names are emitted; the runtime reads
		// credentials from env. Drop the key entirely when no provider is set.
		const resolvedProviders = resolveSocialProviders(
			ctx.options.socialProviders,
		);
		if (Object.keys(resolvedProviders).length > 0) {
			rawOptions.socialProviders = resolvedProviders;
		} else {
			delete rawOptions.socialProviders;
		}
		// Native (Expo) consumer: normalize the `expo` option to a boolean —
		// the runtime only needs to know whether to enable Better Auth's
		// server-side expo() plugin. The deep-link scheme is consumed below.
		const expoOption = ctx.options.expo;
		const expoEnabled = expoOption !== undefined && expoOption !== false;
		if (expoEnabled) {
			rawOptions.expo = true;
		} else {
			delete rawOptions.expo;
		}

		const props = literalToProps(rawOptions);

		// trustedOrigins: web CORS origins, plus the native deep-link scheme
		// when `expo` is set (`${app.name}://` + wildcard by default, or an
		// explicit `scheme` override). A custom scheme is not a valid HTTP CORS
		// origin, so it flows here directly rather than through api.slots.cors —
		// Better Auth's CSRF origin check rejects native requests otherwise, even
		// for ID-token sign-in. Empty is structurally impossible (thrown above),
		// so the consumer sees exactly what Better Auth sees at runtime.
		const trustedOrigins = [...inp.cors];
		if (expoEnabled) {
			const scheme =
				typeof expoOption === "object" && expoOption.scheme
					? expoOption.scheme
					: ctx.app.name;
			trustedOrigins.push(`${scheme}://`, `${scheme}://*`);
		}
		props.trustedOrigins = {
			kind: "array",
			items: trustedOrigins.map((o) => ({ kind: "string", value: o })),
		};

		// Dev-server origins ride separately and are applied by the runtime
		// only under STACK_DEV — baking them in here is what let a production
		// deploy trust localhost.
		if (inp.devCors.length > 0) {
			props.devTrustedOrigins = {
				kind: "array",
				items: inp.devCors.map((o) => ({ kind: "string", value: o })),
			};
		}

		// A native client is always cross-site (custom scheme, no browser
		// origin), so its cookies need sameSite=none in production too. Web
		// consumers stay on the browser default; the runtime widens them to
		// none in dev, where the vite origin and the worker are cross-origin
		// and a lax cookie would be dropped. The runtime pairs sameSite=none
		// with secure=true automatically.
		if (expoEnabled) {
			props.sameSite = { kind: "string", value: "none" };
		}

		return props;
	},
});

// Bug #3: canonical dev URL for `APP_URL`'s devDefault. Pre-fix it was
// hardcoded to "http://localhost:3000" — wrong for API-only apps (no
// frontend at all), wrong when vite's port is customised. This derived
// slot reads `api.slots.devCorsOrigins`: the first local origin wins when a
// frontend plugin is present, otherwise we fall back to the production
// domain. Plugin-auth never imports plugin-vite — the handoff is
// entirely through the shared slot contract.
const appUrlDevDefault = slot.derived({
	source: SOURCE,
	name: "appUrlDevDefault",
	inputs: { devCors: api.slots.devCorsOrigins },
	compute: (inp, ctx): string => {
		const local = inp.devCors.find(isLocalOrigin);
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

export const auth = plugin("auth", {
	label: "Auth",

	schema: authOptionsSchema,

	requires: ["api", "cloudflare", "db"],

	// Payload shapes come from `AuthCallbackPayloads` (./types) — the single
	// source shared with the worker runtime's `AuthCallbacks` interface
	// (./worker/index.ts), so `defineCallbacks`'s inferred type and the
	// worker-safe `AuthCallbacks` type consumers import from `./runtime` can
	// never drift apart.
	callbacks: {
		sendOTP: callback<AuthCallbackPayloads["sendOTP"]>(),
		sendInvitation: callback.optional<AuthCallbackPayloads["sendInvitation"]>(),
		beforeDelete: callback.optional<AuthCallbackPayloads["beforeDelete"]>(),
		sendDeleteVerification:
			callback.optional<AuthCallbackPayloads["sendDeleteVerification"]>(),
		// Read synchronously by better-auth, and `undefined` means "use the
		// default generator for this request", so the return type is declared
		// rather than left at the framework's awaited default.
		generateOTP: callback.optional<
			AuthCallbackPayloads["generateOTP"],
			string | undefined
		>(),
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
		// `app.name` is captured from the contribution ctx (the orchestrator
		// only hands `prompt` into `ask`, so we close over the value here).
		// `.knowledge/architecture/consumer-project.md` documents `app.name` as the default cookie prefix —
		// hardcoding "app" leaked the wrong value into every fresh project.
		cliSlots.initPrompts.contribute((ctx) => {
			const cookiePrefixDefault = ctx.app.name;
			return {
				plugin: "auth",
				ask: async (rawCtx) => {
					// ContributionCtx carries `prompt` in its CLI shape (the ask
					// function is invoked by command code with the real ctx). We
					// cast narrowly to read prompt without widening the public
					// PromptSpec surface.
					const c = rawCtx as {
						prompt: {
							text: (
								msg: string,
								opts?: { default?: string },
							) => Promise<string>;
							confirm: (msg: string) => Promise<boolean>;
						};
					};
					const prefix = await c.prompt.text("Cookie prefix:", {
						default: cookiePrefixDefault,
					});
					const organization = await c.prompt.confirm("Include organizations?");
					return {
						cookies: { prefix },
						organization,
					};
				},
			};
		}),

		// better-auth needs `node:async_hooks` at runtime, which the Workers
		// runtime only exposes under `nodejs_compat`. Unconditional — every
		// auth configuration needs it.
		cloudflare.slots.compatibilityFlags.contribute(() => "nodejs_compat"),

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
			// One client-id + client-secret entry per enabled OAuth provider, so
			// the generated `.dev.vars` template prompts for real credentials.
			const providerSecrets = Object.values(
				resolveSocialProviders(self.options.socialProviders),
			)
				.filter((p): p is NonNullable<typeof p> => p !== undefined)
				.flatMap((p) => [
					{ name: p.clientIdVar, devDefault: "dev-oauth-client-id" },
					{ name: p.clientSecretVar, devDefault: "dev-oauth-client-secret" },
				]);
			return [
				{ name: self.options.secretVar, devDefault: "dev-secret-change-me" },
				{ name: self.options.appUrlVar, devDefault: devAppUrl },
				...providerSecrets,
			];
		}),

		// The auth surface is worker-owned but lives outside api's own
		// prefix, so deploy targets (vite's dev proxy, the node server's mount
		// table) only route it once it is declared here.
		api.slots.routePrefixes.contribute(() => AUTH_PREFIX),

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
				// OAuth-only consumers (`emailOtp: false`) have no required
				// callbacks — skip wiring instead of forcing a dead file.
				if (self.options.emailOtp === false) return undefined;
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

		// RBAC action-name autocomplete for `procedure({ rbac: [...] })`.
		// Contributed only when organization access control is enabled —
		// `organization` absent/`false` leaves `api.slots.rbacStatements` at
		// its `null` default (rbac still works, just without narrowed
		// autocomplete). A custom `organization.ac` (a better-auth
		// `createAccessControl(...)` result) is authoritative when supplied;
		// otherwise fall back to the plugin's own default statements
		// (`access.ts`'s `defaultOrgStatements`, backing `defaultOrgRoles`).
		// Matches what `hasPermission` actually checks at runtime: better-auth
		// authorizes off each role's own `.statements` (built from this same
		// universe via `newRole`), never a separate `ac.statements` lookup — so
		// the default-statements case is exactly the runtime-checked
		// resource/action universe, not a guess.
		api.slots.rbacStatements.contribute(() => {
			const org = self.options.organization;
			if (!org) return undefined;
			const customStatements =
				typeof org === "object"
					? getStatements(
							org.ac as
								| { statements?: Record<string, readonly string[]> }
								| undefined,
						)
					: undefined;
			return customStatements ?? defaultOrgStatements;
		}),

		// Entity vocabulary handoff (WS3.2/WS1 fix)
		// — auth owns these Drizzle tables (`../schema/index.ts`,
		// `../schema/organization.ts`) but a consumer's `src/schema/index.ts`
		// only ever `export *`s them, which `extractSchemaEntities`
		// (plugin-db) deliberately can't see through. Contributing the export
		// names directly here is what makes `procedure({ reads: ["member"] })`
		// (auth's own `orgRules` procedure) — and a consumer's role-changing
		// mutations declaring `writes: ["member"]` — type-check and actually
		// participate in cache invalidation.
		api.slots.entities.contribute(() => {
			const names = ["account", "session", "user", "verification"];
			if (self.options.organization) {
				names.push("invitation", "member", "organization");
			}
			return names;
		}),
	],
});

export type { AuthOptions } from "./types";
