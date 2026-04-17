import { callback, createPlugin } from "@fcalell/cli";
import { Generate, Init, Remove } from "@fcalell/cli/events";
import { db } from "@fcalell/plugin-db";
import type { AuthOptions } from "./types";

const AUTH_CALLBACKS_TEMPLATE = `import { auth } from "@fcalell/plugin-auth";

export default auth.defineCallbacks({
\tsendOTP({ email, code }) {
\t\t// TODO: send OTP email
\t\tconsole.log(\`OTP for \${email}: \${code}\`);
\t},
\tsendInvitation({ email, orgName }) {
\t\t// TODO: send invitation email
\t\tconsole.log(\`Invitation for \${email} to \${orgName}\`);
\t},
});
`;

export const auth = createPlugin("auth", {
	label: "Auth",
	depends: [db.events.SchemaReady],
	callbacks: {
		sendOTP: callback<{ email: string; code: string }>(),
		sendInvitation: callback<{ email: string; orgName: string }>(),
	},

	config(options: AuthOptions = {}) {
		if (
			options?.session?.expiresIn !== undefined &&
			options.session.expiresIn <= 0
		) {
			throw new Error("auth: session.expiresIn must be a positive number");
		}
		return {
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
			rateLimiter: {
				ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
				email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
			},
			...options,
		};
	},

	register(ctx, bus) {
		bus.on(Init.Prompt, async () => {
			await ctx.prompt.text("Cookie prefix:", { default: "app" });
			await ctx.prompt.confirm("Include organizations?");
		});

		bus.on(Init.Scaffold, (p) => {
			p.files.push({
				path: "src/worker/plugins/auth.ts",
				content: AUTH_CALLBACKS_TEMPLATE,
			});
			p.dependencies["@fcalell/plugin-auth"] = "workspace:*";
		});

		bus.on(Generate, (p) => {
			const opts = ctx.options!;
			p.bindings.push(
				{
					name: opts.secretVar ?? "AUTH_SECRET",
					type: "secret",
					devDefault: "dev-secret-change-me",
				},
				{
					name: opts.appUrlVar ?? "APP_URL",
					type: "secret",
					devDefault: "http://localhost:3000",
				},
				{
					name: opts.rateLimiter?.ip?.binding ?? "RATE_LIMITER_IP",
					type: "rate_limiter",
					rateLimit: {
						limit: opts.rateLimiter?.ip?.limit ?? 100,
						period: opts.rateLimiter?.ip?.period ?? 60,
					},
				},
				{
					name: opts.rateLimiter?.email?.binding ?? "RATE_LIMITER_EMAIL",
					type: "rate_limiter",
					rateLimit: {
						limit: opts.rateLimiter?.email?.limit ?? 5,
						period: opts.rateLimiter?.email?.period ?? 300,
					},
				},
			);
		});

		bus.on(Remove, (p) => {
			p.files.push("src/worker/plugins/auth.ts");
			p.dependencies.push("@fcalell/plugin-auth");
		});
	},
});

export type { AuthOptions } from "./types";
