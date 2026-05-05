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

	// Collapse duplicate artifact contributions to the same path. Identical
	// content is fine — multiple `emitArtifact` helpers can resolve to the
	// same string and that's a no-op. Conflicting content is a structural
	// bug: two plugins fighting over the same generated file at runtime is
	// guaranteed to produce one of two surprising outputs depending on
	// resolver order. Throw with a clear error so the conflict is fixed at
	// the contribution site, not papered over by silent last-write-wins.
	const byPath = new Map<string, GeneratedFile>();
	for (const file of rawFiles) {
		const prior = byPath.get(file.path);
		if (prior && prior.content !== file.content) {
			throw new Error(
				`generate: conflicting contributions for artifact "${file.path}". ` +
					`Two plugins emitted different content for the same path. ` +
					`Reconcile by routing both through a single owning slot, or by ` +
					`scoping the contribution to a path the other plugin doesn't claim.`,
			);
		}
		byPath.set(file.path, file);
	}
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
