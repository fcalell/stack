import { createPlugin, fromSchema } from "@fcalell/cli";
import type { TsExpression } from "@fcalell/cli/ast";
import {
	Codegen,
	Composition,
	Deploy,
	Dev,
	Generate,
	Init,
	Remove,
} from "@fcalell/cli/events";
import { z } from "zod";
import { generateRouteBarrel } from "./node/barrel";

// Kept hand-written so `prefix` can use the template-literal type `/${string}`,
// which Zod can't express directly. The schema below complements this interface
// and provides runtime validation with matching error messages.
export interface ApiOptions {
	cors?: string | string[];
	prefix?: `/${string}`;
	domain?: string;
}

const apiOptionsSchema = z.object({
	cors: z
		.union([z.string(), z.array(z.string())], {
			error: "api: cors must be a string or array of strings",
		})
		.optional(),
	prefix: z
		.string()
		.refine((p) => p.startsWith("/"), {
			error: "api: prefix must start with /",
		})
		.default("/rpc"),
	domain: z.string().optional(),
});

const parseApiOptions = fromSchema<ApiOptions>(apiOptionsSchema);

export const api = createPlugin("api", {
	label: "API",

	config(options: ApiOptions): ApiOptions {
		const parsed = parseApiOptions(options ?? {});
		// Cast prefix back to the template-literal type; the refinement above
		// guarantees it starts with "/" at runtime.
		return { ...parsed, prefix: parsed.prefix as `/${string}` };
	},

	register(ctx, bus) {
		bus.on(Init.Scaffold, (p) => {
			p.dependencies["@fcalell/plugin-api"] = "workspace:*";
			p.devDependencies.wrangler = "^4.14.0";
			p.gitignore.push(".wrangler", ".stack");
		});

		bus.on(Generate, (p) => {
			const barrelContent = generateRouteBarrel(ctx.cwd);
			p.files.push({
				path: "src/worker/routes/index.ts",
				content: barrelContent,
			});
		});

		bus.on(Codegen.Worker, async (p) => {
			if (p.base) {
				throw new Error(
					`Plugin "api" cannot claim the worker root because another plugin already did.`,
				);
			}

			const options = (ctx.options ?? {}) as ApiOptions;

			const workerOptions: Array<{ key: string; value: TsExpression }> = [];
			const domain = p.domain || options.domain;
			if (domain) {
				workerOptions.push({
					key: "domain",
					value: { kind: "string", value: domain },
				});
			}
			if (options.prefix) {
				workerOptions.push({
					key: "prefix",
					value: { kind: "string", value: options.prefix },
				});
			}

			const corsOrigins: string[] = [...p.cors];
			if (options.cors) {
				for (const o of Array.isArray(options.cors)
					? options.cors
					: [options.cors]) {
					if (!corsOrigins.includes(o)) corsOrigins.push(o);
				}
			}
			// When a frontend plugin contributed a localhost origin (via its vite
			// dev port), derive matching production origins from the domain.
			const hasLocalhost = corsOrigins.some((o) =>
				o.startsWith("http://localhost"),
			);
			if (hasLocalhost && domain) {
				const domainOrigin = `https://${domain}`;
				if (!corsOrigins.includes(domainOrigin)) corsOrigins.push(domainOrigin);
				const appOrigin = `https://app.${domain}`;
				if (!corsOrigins.includes(appOrigin)) corsOrigins.push(appOrigin);
			}
			if (corsOrigins.length > 0) {
				workerOptions.push({
					key: "cors",
					value: {
						kind: "array",
						items: corsOrigins.map((o) => ({ kind: "string", value: o })),
					},
				});
				// Update the payload's cors list so downstream plugins (e.g. auth)
				// observe the final origins.
				p.cors.splice(0, p.cors.length, ...corsOrigins);
			}

			p.imports.push({
				source: "@fcalell/plugin-api/runtime",
				default: "createWorker",
			});

			p.base = {
				kind: "call",
				callee: { kind: "identifier", name: "createWorker" },
				args:
					workerOptions.length > 0
						? [{ kind: "object", properties: workerOptions }]
						: [],
			};

			const hasRoutes = await ctx.fileExists("src/worker/routes");
			if (hasRoutes) {
				p.imports.push({ source: "../src/worker/routes", namespace: "routes" });
				p.handler = { identifier: "routes" };
			}
		});

		// Consumer middleware is an implicit contribution via the conventional
		// file `src/worker/middleware.ts`. Published via Composition.Middleware
		// so third-party plugins can interleave middleware around it.
		bus.on(Composition.Middleware, async (p) => {
			const hasMiddleware = await ctx.fileExists("src/worker/middleware.ts");
			if (!hasMiddleware) return;
			p.entries.push({
				imports: [
					{
						source: "../src/worker/middleware",
						default: "middleware",
					},
				],
				call: { kind: "identifier", name: "middleware" },
				phase: "before-routes",
				order: 100,
			});
		});

		bus.on(Remove, (p) => {
			p.files.push("src/worker/routes/");
			p.dependencies.push("@fcalell/plugin-api", "wrangler");
		});

		bus.on(Deploy.Execute, (p) => {
			p.steps.push({
				name: "Worker",
				phase: "main",
				exec: {
					command: "npx",
					args: ["wrangler", "deploy", "--config", ".stack/wrangler.toml"],
				},
			});
		});

		bus.on(Dev.Start, (p) => {
			p.processes.push({
				name: "api",
				command: "npx",
				args: [
					"wrangler",
					"dev",
					"--port",
					"8787",
					"--persist-to",
					".stack/dev",
				],
				defaultPort: 8787,
				readyPattern: /Ready on/,
				color: "yellow",
			});

			p.watchers.push({
				name: "routes",
				paths: "src/worker/routes/**",
				ignore: ["**/index.ts"],
				debounce: 300,
				async handler(_path, type) {
					if (type === "add" || type === "unlink") {
						const barrelContent = generateRouteBarrel(ctx.cwd);
						const { writeFileSync } = await import("node:fs");
						const { join } = await import("node:path");
						writeFileSync(
							join(ctx.cwd, "src/worker/routes/index.ts"),
							barrelContent,
						);
						ctx.log.info("Route barrel regenerated");
					}
				},
			});
		});
	},
});

export { ApiError } from "./error";
export type { Middleware } from "./procedure";
export type { InferRouter } from "./types";
