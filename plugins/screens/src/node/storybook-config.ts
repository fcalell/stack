import { randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { StackConfig } from "@fcalell/cli";
import { buildGraphFromConfig } from "@fcalell/cli/build-graph";
import { vite } from "@fcalell/plugin-vite";
import { renderComponentHostConfig } from "./config.ts";

export const STORYBOOK_VITE_CONFIG = ".stack/storybook.vite.config.ts";

// The Vite config of a Storybook that draws components, not routes (the
// showcase's roster), written under `.stack/` and returned as a path for
// Storybook's `viteConfigPath` or Vite's `loadConfigFromFile`: the app's own
// plugin calls and values, resolved from the slot graph, with the host's
// adaptations and without the router plugin, which `vite.slots.appPlugins` keeps
// out of the calls a host reads. A consumer without such a Storybook calls
// nothing, so it gets no file.
export async function writeStorybookConfig(options: {
	config: StackConfig;
	cwd: string;
}): Promise<string> {
	const { graph } = await buildGraphFromConfig(options);
	const outDir = await graph.resolve(vite.slots.outDir);
	if (outDir === null) {
		throw new Error(
			"A Storybook over the app's Vite config needs the vite plugin",
		);
	}
	const source = renderComponentHostConfig({
		configImports: await graph.resolve(vite.slots.configImports),
		pluginCalls: await graph.resolve(vite.slots.pluginCalls),
		resolveAliases: await graph.resolve(vite.slots.resolveAliases),
		resolveDedupe: await graph.resolve(vite.slots.resolveDedupe),
		devServerPort: await graph.resolve(vite.slots.devServerPort),
		outDir,
		serverProxy: await graph.resolve(vite.slots.serverProxy),
		fsAllow: await graph.resolve(vite.slots.fsAllow),
		watchIgnored: await graph.resolve(vite.slots.watchIgnored),
		clientHeaders: await graph.resolve(vite.slots.clientHeaders),
	});
	const path = join(options.cwd, STORYBOOK_VITE_CONFIG);
	await mkdir(join(options.cwd, ".stack"), { recursive: true });
	// Storybook's main.ts and Vitest's config each write it as they load, and a
	// load can overlap a write: a rename hands a reader the whole file or the old one.
	const temp = `${path}.${randomUUID()}.tmp`;
	await writeFile(temp, source);
	await rename(temp, path);
	return path;
}
