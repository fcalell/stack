import { callback, createPlugin } from "@fcalell/cli";
import { Init } from "@fcalell/cli/events";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import type { z } from "zod";
import { authOptionsSchema } from "./types";

// Post-validation view of the options: all schema defaults are guaranteed
// present, so handlers read `opts.rateLimiter.ip.binding` without `??`.
type ResolvedAuthOptions = z.output<typeof authOptionsSchema>;

export const auth = createPlugin("auth", {
	label: "Auth",
	after: [db.events.SchemaReady, cloudflare.events.Wrangler, api.events.Worker],
	callbacks: {
		sendOTP: callback<{ email: string; code: string }>(),
		sendInvitation: callback.optional<{ email: string; orgName: string }>(),
	},

	schema: authOptionsSchema,

	dependencies: {
		"@fcalell/plugin-auth": "workspace:*",
	},

	register(ctx, bus) {
		bus.on(Init.Prompt, async (p) => {
			const prefix = await ctx.prompt.text("Cookie prefix:", {
				default: "app",
			});
			const organization = await ctx.prompt.confirm("Include organizations?");
			p.configOptions.auth = {
				cookies: { prefix },
				organization,
			};
		});

		bus.on(cloudflare.events.Wrangler, (p) => {
			const opts = ctx.options as ResolvedAuthOptions;

			p.secrets.push(
				{ name: opts.secretVar, devDefault: "dev-secret-change-me" },
				{ name: opts.appUrlVar, devDefault: "http://localhost:3000" },
			);

			p.bindings.push(
				{
					kind: "rate_limiter",
					binding: opts.rateLimiter.ip.binding,
					simple: {
						limit: opts.rateLimiter.ip.limit,
						period: opts.rateLimiter.ip.period,
					},
				},
				{
					kind: "rate_limiter",
					binding: opts.rateLimiter.email.binding,
					simple: {
						limit: opts.rateLimiter.email.limit,
						period: opts.rateLimiter.email.period,
					},
				},
			);
		});

		bus.on(api.events.Worker, (p) => {
			const rt = ctx.runtime(p);
			// trustedOrigins is derived from the CLI-computed cors list
			// (app.domain → app.origins), so consumers never configure it.
			// Better Auth needs it for CSRF protection on /api/auth/* routes.
			if (p.cors.length > 0) {
				rt.options.trustedOrigins = {
					kind: "array",
					items: p.cors.map((o) => ({ kind: "string", value: o })),
				};
			}
			// Cross-origin dev: when the cors list includes a localhost origin,
			// browsers won't send cookies unless sameSite=none.
			const crossOriginDev = p.cors.some((o) =>
				o.startsWith("http://localhost"),
			);
			if (crossOriginDev) {
				rt.options.sameSite = { kind: "string", value: "none" };
			}
		});
	},
});

export type { AuthOptions } from "./types";
