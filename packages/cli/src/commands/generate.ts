import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Codegen, Generate } from "#events";
import {
	generateDevVars,
	generateEnvDts,
	generateVirtualWorker,
	generateWranglerToml,
	hasRuntimeExport,
} from "#lib/codegen";
import { loadConfig } from "#lib/config";
import { discoverPlugins, sortByDependencies } from "#lib/discovery";
import { ConfigValidationError } from "#lib/errors";
import { generateApiRouteBarrel } from "#lib/generate";
import { registerPlugins } from "#lib/registration";

const STACK_DIR = ".stack";

export async function generate(configPath: string): Promise<void> {
	const config = await loadConfig(configPath);

	const validation = config.validate();
	if (!validation.valid) {
		throw new ConfigValidationError(validation.errors);
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

	const hasWorkerPlugins = sorted.some((p) => hasRuntimeExport(p.cli.package));

	if (hasWorkerPlugins) {
		// Emit Codegen.Frontend first so frontend plugins (e.g. solid) can
		// announce their port/domain. Always emit — even when no frontend is
		// installed — so worker plugins can always read bus.history() safely.
		const frontend = await bus.emit(Codegen.Frontend, {
			domain: config.domain,
		});

		const workerPayload = await bus.emit(Codegen.Worker, {
			imports: [],
			root: null,
			uses: [],
			handlerArg: "",
			tailLines: [],
			frontend,
		});

		writeFileSync(
			join(stackDir, "worker.ts"),
			generateVirtualWorker(workerPayload),
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
