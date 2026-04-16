import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { log } from "@clack/prompts";
import {
	collectBindings,
	generateDevVars,
	generateEnvDts,
	generateVirtualWorker,
	generateWranglerToml,
} from "#lib/codegen";
import { loadConfig } from "#lib/config";
import { discoverPlugins, sortByDependencies } from "#lib/discovery";
import { generateApiRouteBarrel } from "#lib/generate";
import { createPluginContext } from "#lib/plugin-context";

const STACK_DIR = ".stack";

export async function generate(configPath: string): Promise<void> {
	const config = await loadConfig(configPath);

	const validation = config.validate();
	if (!validation.valid) {
		for (const err of validation.errors) {
			log.error(`[${err.plugin}] ${err.message}${err.fix ? ` — ${err.fix}` : ""}`);
		}
		process.exit(1);
	}

	const discovered = await discoverPlugins(config);
	const sorted = sortByDependencies(discovered, config);
	const cwd = process.cwd();
	const ctx = createPluginContext({ cwd, config });

	const stackDir = join(cwd, STACK_DIR);
	mkdirSync(stackDir, { recursive: true });

	const { bindings, collisions } = collectBindings(sorted);
	if (collisions.length > 0) {
		for (const c of collisions) {
			log.warn(
				`Binding name "${c.name}" declared by multiple plugins: ${c.plugins.join(", ")}`,
			);
		}
	}

	for (const p of sorted) {
		const files = await p.cli.generate(ctx);
		for (const f of files) {
			const fullPath = join(cwd, f.path);
			mkdirSync(join(fullPath, ".."), { recursive: true });
			writeFileSync(fullPath, f.content);
		}
	}

	if (bindings.length > 0) {
		writeFileSync(join(stackDir, "env.d.ts"), generateEnvDts(bindings));
	}

	const pluginsWithWorker = sorted
		.filter((p) => p.cli.worker)
		.map((p) => ({ name: p.name, worker: p.cli.worker }));

	if (pluginsWithWorker.length > 0) {
		const hasMiddleware = existsSync(
			join(cwd, "src", "worker", "middleware.ts"),
		);
		const hasRoutes = existsSync(join(cwd, "src", "worker", "routes"));
		const callbackFiles: string[] = [];

		for (const p of sorted) {
			if (p.cli.worker?.callbacks) {
				const cbPath = join(
					cwd,
					"src",
					"worker",
					"plugins",
					`${p.name}.ts`,
				);
				if (existsSync(cbPath)) {
					callbackFiles.push(p.name);
				}
			}
		}

		writeFileSync(
			join(stackDir, "worker.ts"),
			generateVirtualWorker({
				plugins: pluginsWithWorker,
				hasMiddleware,
				hasRoutes,
				callbackFiles,
			}),
		);

		const consumerWrangler = existsSync(join(cwd, "wrangler.toml"))
			? readFileSync(join(cwd, "wrangler.toml"), "utf-8")
			: null;

		writeFileSync(
			join(stackDir, "wrangler.toml"),
			generateWranglerToml({ consumerWrangler, bindings }),
		);

		const devVarsPath = join(cwd, ".dev.vars");
		if (!existsSync(devVarsPath)) {
			const devVars = generateDevVars(bindings);
			if (devVars) {
				writeFileSync(devVarsPath, devVars);
			}
		}
	}

	const routesDir = join(cwd, "src", "worker", "routes");
	if (existsSync(routesDir)) {
		generateApiRouteBarrel(cwd);
	}
}
