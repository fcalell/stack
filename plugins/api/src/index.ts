import { createPlugin, fromSchema } from "@fcalell/cli";
import {
	Codegen,
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

const WRANGLER_TEMPLATE = (name: string) =>
	`name = "${name}"
compatibility_date = "${new Date().toISOString().split("T")[0]}"
main = ".stack/worker.ts"
`;

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
			p.files.push({
				path: "wrangler.toml",
				content: WRANGLER_TEMPLATE("my-app"),
			});

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
			if (p.root) {
				throw new Error(
					`Plugin "api" cannot claim the worker root because another plugin already did.`,
				);
			}

			const options = (ctx.options ?? {}) as {
				cors?: string | string[];
				prefix?: `/${string}`;
				domain?: string;
			};

			const workerOptions: Record<string, unknown> = {};
			const domain = p.frontend?.domain ?? options.domain;
			if (domain) workerOptions.domain = domain;
			if (options.prefix) workerOptions.prefix = options.prefix;

			const corsOrigins: string[] = [];
			if (options.cors) {
				corsOrigins.push(
					...(Array.isArray(options.cors) ? options.cors : [options.cors]),
				);
			}
			const frontendPort = p.frontend?.port;
			if (frontendPort != null) {
				const localOrigin = `http://localhost:${frontendPort}`;
				if (!corsOrigins.includes(localOrigin)) {
					corsOrigins.push(localOrigin);
				}
				if (domain) {
					const domainOrigin = `https://${domain}`;
					if (!corsOrigins.includes(domainOrigin)) {
						corsOrigins.push(domainOrigin);
					}
					const appOrigin = `https://app.${domain}`;
					if (!corsOrigins.includes(appOrigin)) {
						corsOrigins.push(appOrigin);
					}
				}
			}
			if (corsOrigins.length > 0) {
				workerOptions.cors = corsOrigins;
			}

			p.imports.push(`import createWorker from "@fcalell/plugin-api/runtime";`);
			p.root = {
				factoryName: "createWorker",
				options: workerOptions,
			};

			const hasMiddleware = await ctx.fileExists("src/worker/middleware.ts");
			if (hasMiddleware) {
				p.imports.push('import middleware from "../src/worker/middleware";');
				p.uses.push({ kind: "identifier", identifier: "middleware" });
			}

			const hasRoutes = await ctx.fileExists("src/worker/routes");
			if (hasRoutes) {
				p.imports.push('import * as routes from "../src/worker/routes";');
				p.handlerArg = "routes";
			}

			p.tailLines.push("export type AppRouter = typeof worker._router;");
			p.tailLines.push("export default worker;");
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
