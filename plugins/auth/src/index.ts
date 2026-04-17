import { callback, createPlugin, fromSchema } from "@fcalell/cli";
import { Codegen, Generate, Init, Remove } from "@fcalell/cli/events";
import { db } from "@fcalell/plugin-db";
import { type AuthOptions, authOptionsSchema } from "./types";

function serialize(value: unknown): string {
	return JSON.stringify(value, null, "\t");
}

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

	config: fromSchema<AuthOptions>(authOptionsSchema),

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

		bus.on(Init.Scaffold, (p) => {
			p.files.push({
				path: "src/worker/plugins/auth.ts",
				content: AUTH_CALLBACKS_TEMPLATE,
			});
			p.dependencies["@fcalell/plugin-auth"] = "workspace:*";
		});

		bus.on(Generate, (p) => {
			const opts = ctx.options;
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

		bus.on(Codegen.Worker, async (p) => {
			p.imports.push(`import authRuntime from "@fcalell/plugin-auth/runtime";`);

			const effectiveOptions: Record<string, unknown> = {
				...(ctx.options as Record<string, unknown>),
			};
			// Cross-origin dev: when a frontend is present, cookies need
			// sameSite=none so the browser sends them to the worker origin.
			if (p.frontend?.port != null) {
				effectiveOptions.sameSite = "none";
			}
			const opts = serialize(effectiveOptions);

			const hasCallbacks = await ctx.fileExists("src/worker/plugins/auth.ts");
			if (hasCallbacks) {
				p.imports.push(
					`import authCallbacks from "../src/worker/plugins/auth";`,
				);
				p.useLines.push(
					`\t.use(authRuntime({ ...${opts}, callbacks: authCallbacks }))`,
				);
			} else {
				p.useLines.push(`\t.use(authRuntime(${opts}))`);
			}
		});
	},
});

export type { AuthOptions } from "./types";
