import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { log } from "@clack/prompts";
import { Generate } from "#events";
import {
	generateDevVars,
	generateEnvDts,
	generateVirtualWorkerV2,
	generateWranglerToml,
	hasRuntimeExport,
} from "#lib/codegen-v2";
import { loadConfig } from "#lib/config";
import { discoverPlugins, sortByDependencies } from "#lib/discovery";
import { generateApiRouteBarrel } from "#lib/generate";
import { registerPlugins } from "#lib/registration";

const STACK_DIR = ".stack";

export async function generate(configPath: string): Promise<void> {
	const config = await loadConfig(configPath);

	const validation = config.validate();
	if (!validation.valid) {
		for (const err of validation.errors) {
			log.error(
				`[${err.plugin}] ${err.message}${err.fix ? ` — ${err.fix}` : ""}`,
			);
		}
		process.exit(1);
	}

	const discovered = await discoverPlugins(config);
	const sorted = sortByDependencies(discovered);
	const cwd = process.cwd();

	const stackDir = join(cwd, STACK_DIR);
	mkdirSync(stackDir, { recursive: true });

	const bus = registerPlugins(sorted, config, cwd);

	// Emit Generate event to collect files and bindings from plugins
	const genResult = await bus.emit(Generate, { files: [], bindings: [] });

	// Write plugin-contributed files
	for (const f of genResult.files) {
		const fullPath = join(cwd, f.path);
		mkdirSync(join(fullPath, ".."), { recursive: true });
		writeFileSync(fullPath, f.content);
	}

	const allBindings = genResult.bindings;

	if (allBindings.length > 0) {
		writeFileSync(join(stackDir, "env.d.ts"), generateEnvDts(allBindings));
	}

	const hasWorkerPlugins = sorted.some((p) =>
		hasRuntimeExport(`@fcalell/plugin-${p.name}`),
	);

	if (hasWorkerPlugins) {
		const hasMiddleware = existsSync(
			join(cwd, "src", "worker", "middleware.ts"),
		);
		const hasRoutes = existsSync(join(cwd, "src", "worker", "routes"));
		const hasSchema = existsSync(join(cwd, "src", "schema"));

		const pluginInfos = sorted
			.map((p) => {
				const packageName = `@fcalell/plugin-${p.name}`;
				return {
					name: p.name,
					packageName,
					hasRuntime: hasRuntimeExport(packageName),
					hasCallbacks: Object.keys(p.cli.callbacks).length > 0,
					options: (p.options ?? {}) as Record<string, unknown>,
				};
			})
			.filter((p) => p.hasRuntime);

		const hasFrontend = sorted.some((p) => p.name === "vite");
		const hasAuth = sorted.some((p) => p.name === "auth");
		const vitePlugin = sorted.find((p) => p.name === "vite");
		const frontendPort = hasFrontend
			? (((vitePlugin?.options as Record<string, unknown> | undefined)?.port as
					| number
					| undefined) ?? 3000)
			: undefined;

		writeFileSync(
			join(stackDir, "worker.ts"),
			generateVirtualWorkerV2({
				plugins: pluginInfos,
				hasSchema,
				hasMiddleware,
				hasRoutes,
				domain: config.domain,
				frontendPort,
				hasFrontend,
				hasAuth,
			}),
		);

		const consumerWrangler = existsSync(join(cwd, "wrangler.toml"))
			? readFileSync(join(cwd, "wrangler.toml"), "utf-8")
			: null;

		writeFileSync(
			join(stackDir, "wrangler.toml"),
			generateWranglerToml({ consumerWrangler, bindings: allBindings }),
		);

		const devVarsPath = join(cwd, ".dev.vars");
		if (!existsSync(devVarsPath)) {
			const devVars = generateDevVars(allBindings);
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
