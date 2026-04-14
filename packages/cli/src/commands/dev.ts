import { watch } from "node:fs";
import { dirname, resolve } from "node:path";
import { getSchemaPath } from "@fcalell/db";
import { ensureAuthSchema, push, startStudio } from "#drizzle/run";
import { loadConfig } from "#lib/config";
import { detect } from "#lib/detect";
import { requireFeature } from "#lib/scaffold";

interface DevOptions {
	studio: boolean;
	config: string;
}

export async function dev(options: DevOptions): Promise<void> {
	requireFeature("Database", detect().hasConfig, "Run `stack init` first.");

	const config = await loadConfig(options.config);

	if (!ensureAuthSchema(config)) process.exit(1);
	if (!push(config)) process.exit(1);

	const schemaPath = resolve(getSchemaPath(config.db));
	const watchDir = schemaPath.endsWith(".ts")
		? dirname(schemaPath)
		: schemaPath;

	let debounce: ReturnType<typeof setTimeout>;
	watch(watchDir, { recursive: true }, (_event, filename) => {
		if (!filename?.endsWith(".ts")) return;
		clearTimeout(debounce);
		debounce = setTimeout(() => {
			console.log("\nSchema change detected, pushing...");
			push(config);
		}, 300);
	});

	console.log("Watching for schema changes...");

	let studioChild: ReturnType<typeof startStudio> | null = null;
	if (options.studio) {
		studioChild = startStudio(config);
	}

	process.on("SIGINT", () => {
		studioChild?.kill();
		process.exit(0);
	});
}
