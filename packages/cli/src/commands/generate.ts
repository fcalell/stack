import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Codegen, Composition, Generate } from "#events";
import {
	aggregateAppCss,
	aggregateDevVars,
	aggregateEntry,
	aggregateEnvDts,
	aggregateHtml,
	aggregateMiddleware,
	aggregateProviders,
	aggregateViteConfig,
	aggregateWorker,
	aggregateWrangler,
	hasRuntimeExport,
} from "#lib/codegen";
import { loadConfig } from "#lib/config";
import { discoverPlugins, sortByDependencies } from "#lib/discovery";
import { ConfigValidationError } from "#lib/errors";
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

	// Emit Generate event to collect plain files from plugins (e.g. api's route
	// barrel). Bindings now flow through Codegen.Wrangler / Codegen.Env.
	const genResult = await bus.emit(Generate, { files: [] });

	for (const f of genResult.files) {
		const fullPath = join(cwd, f.path);
		mkdirSync(join(fullPath, ".."), { recursive: true });
		writeFileSync(fullPath, f.content);
	}

	const hasWorkerPlugins = sorted.some((p) => hasRuntimeExport(p.cli.package));

	// Codegen.Wrangler — bindings, routes, vars, secrets.
	const wranglerPayload = await bus.emit(Codegen.Wrangler, {
		bindings: [],
		routes: [],
		vars: {},
		secrets: [],
		compatibilityDate: new Date().toISOString().split("T")[0] ?? "",
	});

	// Codegen.Env — typed env.d.ts fields.
	const envPayload = await bus.emit(Codegen.Env, { fields: [] });

	if (envPayload.fields.length > 0) {
		writeFileSync(join(stackDir, "env.d.ts"), aggregateEnvDts(envPayload));
	}

	// Codegen.ViteConfig — moved from Dev/Build Configure to generate time.
	const viteConfigPayload = await bus.emit(Codegen.ViteConfig, {
		imports: [],
		pluginCalls: [],
		resolveAliases: [],
		devServerPort: 0,
	});

	if (
		viteConfigPayload.pluginCalls.length > 0 ||
		viteConfigPayload.imports.length > 0
	) {
		writeFileSync(
			join(stackDir, "vite.config.ts"),
			aggregateViteConfig(viteConfigPayload),
		);
	}

	if (hasWorkerPlugins) {
		// Composition.Middleware must fire BEFORE Codegen.Worker so the worker
		// payload is seeded with the ordered middleware chain (and the imports
		// needed for the calls). Plugins can still contribute via Codegen.Worker
		// directly, but the canonical surface is Composition.Middleware.
		const middlewarePayload = await bus.emit(Composition.Middleware, {
			entries: [],
		});
		const aggregated = aggregateMiddleware(middlewarePayload);

		const workerPayload = await bus.emit(Codegen.Worker, {
			imports: aggregated?.imports ?? [],
			base: null,
			middlewareChain: aggregated?.calls ?? [],
			handler: null,
			domain: config.app.domain,
			cors: [],
		});

		writeFileSync(join(stackDir, "worker.ts"), aggregateWorker(workerPayload));

		const consumerWrangler = existsSync(join(cwd, "wrangler.toml"))
			? readFileSync(join(cwd, "wrangler.toml"), "utf-8")
			: null;

		writeFileSync(
			join(stackDir, "wrangler.toml"),
			aggregateWrangler({ consumerWrangler, payload: wranglerPayload }),
		);

		const devVarsPath = join(cwd, ".dev.vars");
		if (!existsSync(devVarsPath)) {
			const devVars = aggregateDevVars(wranglerPayload.secrets);
			if (devVars) {
				writeFileSync(devVarsPath, devVars);
			}
		}
	}

	const providersPayload = await bus.emit(Composition.Providers, {
		providers: [],
	});
	const providersSource = aggregateProviders(providersPayload);
	if (providersSource !== null) {
		writeFileSync(join(stackDir, "virtual-providers.tsx"), providersSource);
	}

	const entryPayload = await bus.emit(Codegen.Entry, {
		imports: [],
		mountExpression: null,
	});
	const entrySource = aggregateEntry(entryPayload);
	if (entrySource !== null) {
		writeFileSync(join(stackDir, "entry.tsx"), entrySource);
	}

	const htmlPayload = await bus.emit(Codegen.Html, {
		shell: null,
		head: [],
		bodyEnd: [],
	});
	const htmlSource = await aggregateHtml(htmlPayload);
	if (htmlSource !== null) {
		writeFileSync(join(stackDir, "index.html"), htmlSource);
	}

	const appCssPayload = await bus.emit(Codegen.AppCss, {
		imports: [],
		layers: [],
	});
	const appCssSource = aggregateAppCss(appCssPayload);
	if (appCssSource !== null) {
		writeFileSync(join(stackDir, "app.css"), appCssSource);
	}

	await bus.emit(Codegen.RoutesDts, { pagesDir: null });
}
