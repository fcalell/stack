import { watch } from "node:fs";
import { dirname, resolve } from "node:path";
import { type DatabaseConfig, getSchemaPath } from "#kit/config";
import { ensureAuthSchema, push, startStudio } from "#kit/run";

export function dev(
	config: DatabaseConfig,
	options: { studio: boolean },
): void {
	if (!ensureAuthSchema(config)) process.exit(1);
	if (!push(config)) process.exit(1);

	const schemaPath = resolve(getSchemaPath(config));
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
