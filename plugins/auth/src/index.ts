import { callback, createPlugin, fromSchema } from "@fcalell/cli";
import type { TsExpression, TsImportSpec } from "@fcalell/cli/ast";
import { Codegen, Init, Remove } from "@fcalell/cli/events";
import { db } from "@fcalell/plugin-db";
import { type AuthOptions, authOptionsSchema } from "./types";

function toExpression(value: unknown): TsExpression {
	if (value === null) return { kind: "null" };
	if (value === undefined) return { kind: "undefined" };
	if (typeof value === "string") return { kind: "string", value };
	if (typeof value === "number") return { kind: "number", value };
	if (typeof value === "boolean") return { kind: "boolean", value };
	if (Array.isArray(value)) {
		return { kind: "array", items: value.map(toExpression) };
	}
	if (typeof value === "object") {
		const properties: Array<{ key: string; value: TsExpression }> = [];
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			properties.push({ key: k, value: toExpression(v) });
		}
		return { kind: "object", properties };
	}
	// Fallback: stringify unknowns (e.g. functions/classes should not appear
	// in plugin options, but we need TS types to stay sound).
	return { kind: "string", value: String(value) };
}

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
				source: new URL("../templates/auth-callbacks.ts", import.meta.url),
				target: "src/worker/plugins/auth.ts",
			});
			p.dependencies["@fcalell/plugin-auth"] = "workspace:*";
		});

		bus.on(Codegen.Wrangler, (p) => {
			const opts = ctx.options;
			const secretName = opts.secretVar ?? "AUTH_SECRET";
			const appUrlName = opts.appUrlVar ?? "APP_URL";

			p.secrets.push(
				{ name: secretName, devDefault: "dev-secret-change-me" },
				{ name: appUrlName, devDefault: "http://localhost:3000" },
			);

			p.bindings.push(
				{
					kind: "rate_limiter",
					binding: opts.rateLimiter?.ip?.binding ?? "RATE_LIMITER_IP",
					simple: {
						limit: opts.rateLimiter?.ip?.limit ?? 100,
						period: opts.rateLimiter?.ip?.period ?? 60,
					},
				},
				{
					kind: "rate_limiter",
					binding: opts.rateLimiter?.email?.binding ?? "RATE_LIMITER_EMAIL",
					simple: {
						limit: opts.rateLimiter?.email?.limit ?? 5,
						period: opts.rateLimiter?.email?.period ?? 300,
					},
				},
			);
		});

		bus.on(Codegen.Env, (p) => {
			const opts = ctx.options;
			const secretName = opts.secretVar ?? "AUTH_SECRET";
			const appUrlName = opts.appUrlVar ?? "APP_URL";
			const stringType = { kind: "reference" as const, name: "string" };
			const rateLimiterImport: TsImportSpec = {
				source: "@cloudflare/workers-types",
				named: ["RateLimiter"],
				typeOnly: true,
			};

			p.fields.push(
				{ name: secretName, type: stringType },
				{ name: appUrlName, type: stringType },
				{
					name: opts.rateLimiter?.ip?.binding ?? "RATE_LIMITER_IP",
					type: { kind: "reference", name: "RateLimiter" },
					from: rateLimiterImport,
				},
				{
					name: opts.rateLimiter?.email?.binding ?? "RATE_LIMITER_EMAIL",
					type: { kind: "reference", name: "RateLimiter" },
					from: rateLimiterImport,
				},
			);
		});

		bus.on(Remove, (p) => {
			p.files.push("src/worker/plugins/auth.ts");
			p.dependencies.push("@fcalell/plugin-auth");
		});

		bus.on(Codegen.Worker, async (p) => {
			p.imports.push({
				source: "@fcalell/plugin-auth/runtime",
				default: "authRuntime",
			});

			const options: Record<string, unknown> = {
				...(ctx.options as Record<string, unknown>),
			};
			// Cross-origin dev: when the cors list includes a localhost origin,
			// browsers won't send cookies unless sameSite=none.
			const crossOriginDev = p.cors.some((o) =>
				o.startsWith("http://localhost"),
			);
			if (crossOriginDev) {
				options.sameSite = "none";
			}

			const hasCallbacks = await ctx.fileExists("src/worker/plugins/auth.ts");
			const argExpr = toExpression(options);
			if (argExpr.kind === "object" && hasCallbacks) {
				p.imports.push({
					source: "../src/worker/plugins/auth",
					default: "authCallbacks",
				});
				argExpr.properties.push({
					key: "callbacks",
					value: { kind: "identifier", name: "authCallbacks" },
					shorthand: true,
				});
			}

			p.middlewareChain.push({
				kind: "call",
				callee: { kind: "identifier", name: "authRuntime" },
				args: [argExpr],
			});
		});
	},
});

export type { AuthOptions } from "./types";
