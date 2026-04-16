import type { CliPlugin, GeneratedFile } from "@fcalell/config/plugin";
import type { AuthOptions } from "./index";

const AUTH_CALLBACKS_TEMPLATE = `import { defineAuthCallbacks } from "@fcalell/plugin-auth";

export default defineAuthCallbacks({
\tasync sendOTP({ email, otp }) {
\t\t// TODO: send OTP email
\t\tconsole.log(\`OTP for \${email}: \${otp}\`);
\t},
});
`;

const plugin: CliPlugin<AuthOptions> = {
	name: "auth",
	label: "Auth",

	detect(ctx) {
		return ctx.hasPlugin("auth");
	},

	async prompt(ctx) {
		const prefix = await ctx.prompt.text("Cookie prefix:", {
			default: "app",
		});
		const organization = await ctx.prompt.confirm("Include organizations?");
		return { cookiePrefix: prefix, organization };
	},

	async scaffold(ctx, _answers) {
		await ctx.writeIfMissing(
			"src/worker/plugins/auth.ts",
			AUTH_CALLBACKS_TEMPLATE,
		);
		ctx.addDependencies({
			"@fcalell/plugin-auth": "workspace:*",
		});
	},

	bindings(options) {
		return [
			{
				name: options.secretVar ?? "AUTH_SECRET",
				type: "secret",
				devDefault: "dev-secret-change-me",
			},
			{
				name: options.appUrlVar ?? "APP_URL",
				type: "secret",
				devDefault: "http://localhost:3000",
			},
			{
				name: options.rateLimiter?.ip?.binding ?? "RATE_LIMITER_IP",
				type: "rate_limiter",
				rateLimit: {
					limit: options.rateLimiter?.ip?.limit ?? 100,
					period: options.rateLimiter?.ip?.period ?? 60,
				},
			},
			{
				name: options.rateLimiter?.email?.binding ?? "RATE_LIMITER_EMAIL",
				type: "rate_limiter",
				rateLimit: {
					limit: options.rateLimiter?.email?.limit ?? 5,
					period: options.rateLimiter?.email?.period ?? 300,
				},
			},
		];
	},

	async generate(_ctx): Promise<GeneratedFile[]> {
		// Auth schema generation is handled by the db plugin's dev/deploy hooks
		// via better-auth CLI. No standalone generated files needed here.
		return [];
	},

	worker: {
		runtime: {
			importFrom: "@fcalell/plugin-auth/runtime",
			factory: "authRuntime",
		},
		callbacks: {
			required: false,
			defineHelper: "defineAuthCallbacks",
			importFrom: "@fcalell/plugin-auth",
		},
		routes: true,
	},
};

export default plugin;
