import { existsSync, watch } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { intro, log, note, spinner } from "@clack/prompts";
import { getSchemaPath } from "@fcalell/db";
import pc from "picocolors";
import { ensureAuthSchema, push, writeStudioConfig } from "#drizzle/run";
import { loadConfig } from "#lib/config";
import { detect } from "#lib/detect";
import { generateApiRouteBarrel, generateEnvDts } from "#lib/generate";
import { type ManagedProcess, onExit, spawnPrefixed } from "#lib/proc";
import { requireFeature } from "#lib/scaffold";

interface DevOptions {
	studio: boolean;
	config: string;
}

export async function dev(options: DevOptions): Promise<void> {
	const state = detect();
	requireFeature("Database", state.hasConfig, "Run `stack init` first.");

	intro("stack dev");

	const config = await loadConfig(options.config);

	generateEnvDts(config);

	const s = spinner();
	s.start("Pushing schema...");
	if (!ensureAuthSchema(config)) process.exit(1);
	if (!push(config)) process.exit(1);
	s.stop("Schema pushed");

	const hasOrg = !!config.auth?.organization;
	const bannerLines = [
		`Database:  ${config.db.dialect}${config.db.dialect === "d1" ? " (local)" : ""}`,
		`Auth:      ${config.auth ? `enabled${hasOrg ? " (with organizations)" : ""}` : "off"}`,
		`API:       ${state.hasApi ? "watching routes" : "off"}`,
		`App:       ${state.hasApp ? "file-based routing" : "off"}`,
		`Studio:    ${options.studio ? `port ${config.dev?.studioPort ?? 4983}` : "off"}`,
	];
	note(bannerLines.join("\n"), "Configuration");

	const processes: ManagedProcess[] = [];

	// Schema watcher
	const schemaPath = resolve(getSchemaPath(config.db));
	const watchDir = schemaPath.endsWith(".ts")
		? dirname(schemaPath)
		: schemaPath;
	let schemaDebounce: ReturnType<typeof setTimeout>;
	watch(watchDir, { recursive: true }, (_event, filename) => {
		if (!filename?.endsWith(".ts")) return;
		clearTimeout(schemaDebounce);
		schemaDebounce = setTimeout(() => {
			log.step("Schema change detected, pushing...");
			push(config);
		}, 300);
	});

	// API route barrel watcher
	const routesDir = join(process.cwd(), "src", "worker", "routes");
	if (existsSync(routesDir)) {
		generateApiRouteBarrel();
		let routesDebounce: ReturnType<typeof setTimeout>;
		watch(routesDir, (_event, filename) => {
			if (!filename?.endsWith(".ts") || filename === "index.ts") return;
			clearTimeout(routesDebounce);
			routesDebounce = setTimeout(() => {
				log.step("Route change detected, regenerating barrel...");
				generateApiRouteBarrel();
			}, 300);
		});
	}

	// Spawn wrangler dev (API server)
	if (state.hasApi) {
		processes.push(
			spawnPrefixed({
				name: "api",
				color: pc.yellow,
				command: "npx",
				args: ["wrangler", "dev"],
			}),
		);
	}

	// Spawn stack-vite dev (app dev server)
	if (state.hasApp) {
		processes.push(
			spawnPrefixed({
				name: "app",
				color: pc.cyan,
				command: "npx",
				args: ["stack-vite", "dev"],
			}),
		);
	}

	// Spawn Drizzle Studio
	if (options.studio) {
		const studioArgs = writeStudioConfig(config);
		processes.push(
			spawnPrefixed({
				name: "studio",
				color: pc.magenta,
				command: "npx",
				args: studioArgs,
			}),
		);
	}

	log.info("Watching for changes...");

	for (const proc of processes) {
		proc.child.on("exit", (code) => {
			if (code !== 0 && code !== null) {
				log.warn(`[${proc.name}] exited with code ${code}`);
			}
		});
	}

	onExit(processes);
}
