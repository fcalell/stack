import { createPlugin } from "@fcalell/cli";
import { Deploy, Dev, Generate, Init, Remove } from "@fcalell/cli/events";
import { generateRouteBarrel } from "./node/barrel";

export interface ApiOptions {
	cors?: string | string[];
	prefix?: `/${string}`;
	domain?: string;
}

const WRANGLER_TEMPLATE = (name: string) =>
	`name = "${name}"
compatibility_date = "${new Date().toISOString().split("T")[0]}"
main = ".stack/worker.ts"
`;

export const api = createPlugin("api", {
	label: "API",

	config(options: ApiOptions) {
		const opts = options ?? {};
		if (opts.prefix && !opts.prefix.startsWith("/")) {
			throw new Error("api: prefix must start with /");
		}
		if (opts.cors !== undefined) {
			const corsVal = opts.cors;
			if (
				typeof corsVal !== "string" &&
				(!Array.isArray(corsVal) ||
					!corsVal.every((c) => typeof c === "string"))
			) {
				throw new Error("api: cors must be a string or array of strings");
			}
		}
		return { prefix: "/rpc" as `/${string}`, ...opts };
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
