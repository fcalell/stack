import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { StackConfig } from "#config";
import { buildGraphFromConfig } from "#lib/build-graph";
import { cliSlots } from "#lib/cli-slots";
import { loadConfig } from "#lib/config";
import type { DiscoveredPlugin } from "#lib/discovery";
import type { GeneratedFile } from "#specs";

export interface GenerateResult {
	files: GeneratedFile[];
	postWrite: Array<() => Promise<void>>;
	sorted: Array<{ name: string }>;
}

// Resolve `cliSlots.artifactFiles` + `cliSlots.postWrite` from the graph.
// Dedupes files by path (last write wins), optionally persists to disk,
// then runs each postWrite hook sequentially.
export async function generateFromConfig(
	config: StackConfig,
	cwd: string,
	opts: { writeToDisk?: boolean } = {},
): Promise<GenerateResult> {
	const { graph, sorted } = await buildGraphFromConfig({ config, cwd });

	const rawFiles = await graph.resolve(cliSlots.artifactFiles);
	const postWrite = await graph.resolve(cliSlots.postWrite);

	// Dedupe files by path. Later contributions overwrite earlier ones — this
	// matches the old behaviour where two plugins writing the same file would
	// have the latter win. Duplicates with identical content collapse to one.
	const byPath = new Map<string, GeneratedFile>();
	for (const file of rawFiles) byPath.set(file.path, file);
	const files = [...byPath.values()];

	if (opts.writeToDisk) {
		for (const file of files) {
			const absPath = resolve(cwd, file.path);
			await mkdir(dirname(absPath), { recursive: true });
			await writeFile(absPath, file.content);
		}
		for (const hook of postWrite) {
			await hook();
		}
	}

	return {
		files,
		postWrite,
		sorted: sorted.map((p: DiscoveredPlugin) => ({ name: p.name })),
	};
}

export async function generate(configPath: string): Promise<void> {
	const config = await loadConfig(configPath);
	await generateFromConfig(config, process.cwd(), { writeToDisk: true });
}
