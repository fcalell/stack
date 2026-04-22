import { callback, plugin, slot } from "@fcalell/cli";
import type { TsExpression } from "@fcalell/cli/ast";
import { literalToProps } from "@fcalell/cli/ast";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { PluginRuntimeEntry } from "@fcalell/plugin-api";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import type { z } from "zod";
import { type AuthOptions, authOptionsSchema } from "./types";

// Post-validation view of options: schema defaults guaranteed present.
type ResolvedAuthOptions = z.output<typeof authOptionsSchema>;

const SOURCE = "auth";

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
		const opts = ctx.options as ResolvedAuthOptions;

		// Seed with every consumer-supplied option (secretVar, appUrlVar,
		// cookies, session, user, organization, rateLimiter). `literalToProps`
		// produces a Record<string, TsExpression> so we can splice in derived
		// keys below without re-literalising the whole object.
		const props = literalToProps(opts as unknown as Record<string, unknown>);

		// trustedOrigins derives from the fully-resolved cors list — never
		// consumer-configured, never racey.
		if (inp.cors.length > 0) {
			props.trustedOrigins = {
				kind: "array",
				items: inp.cors.map((o) => ({ kind: "string", value: o })),
			};
		}

		// Cross-origin localhost dev: browsers drop cookies without
		// sameSite=none.
		const crossOriginDev = inp.cors.some((o) =>
			o.startsWith("http://localhost"),
		);
		if (crossOriginDev) {
			props.sameSite = { kind: "string", value: "none" };
		}

		return props;
	},
});

export const auth = plugin<
	"auth",
	AuthOptions,
	{ runtimeOptions: typeof runtimeOptions },
	{
		sendOTP: ReturnType<typeof callback<{ email: string; code: string }>>;
		sendInvitation: ReturnType<
			typeof callback.optional<{ email: string; orgName: string }>
		>;
	}
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
		cloudflare.slots.bindings.contribute((ctx) => {
			const opts = ctx.options as ResolvedAuthOptions;
			return [
				{
					kind: "rate_limiter" as const,
					binding: opts.rateLimiter.ip.binding,
					simple: {
						limit: opts.rateLimiter.ip.limit,
						period: opts.rateLimiter.ip.period,
					},
				},
				{
					kind: "rate_limiter" as const,
					binding: opts.rateLimiter.email.binding,
					simple: {
						limit: opts.rateLimiter.email.limit,
						period: opts.rateLimiter.email.period,
					},
				},
			];
		}),

		// Secrets: AUTH_SECRET + APP_URL (consumer-renameable via options).
		cloudflare.slots.secrets.contribute((ctx) => {
			const opts = ctx.options as ResolvedAuthOptions;
			return [
				{ name: opts.secretVar, devDefault: "dev-secret-change-me" },
				{ name: opts.appUrlVar, devDefault: "http://localhost:3000" },
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
		// entry when it exists on disk.
		api.slots.callbacks.contribute(async (ctx) => {
			const exists = await ctx.fileExists("src/worker/plugins/auth.ts");
			if (!exists) return undefined;
			return {
				auth: {
					import: {
						source: "../src/worker/plugins/auth",
						default: "authCallbacks",
					},
					identifier: "authCallbacks",
				},
			};
		}),
	],
});

export type { AuthOptions } from "./types";
