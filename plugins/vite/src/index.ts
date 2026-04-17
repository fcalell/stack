import { join } from "node:path";
import { createPlugin } from "@fcalell/cli";
import { Build, Dev } from "@fcalell/cli/events";
import type { ViteOptions } from "./types";

function buildViteConfig(configPayload: {
	viteImports: string[];
	vitePluginCalls: string[];
}): string {
	const imports = [
		'import { defineConfig } from "vite";',
		'import tailwindcss from "@tailwindcss/vite";',
		'import { themeFontsPlugin } from "@fcalell/plugin-vite/preset";',
		...configPayload.viteImports,
	];

	const pluginCalls = [
		"tailwindcss()",
		"themeFontsPlugin()",
		...configPayload.vitePluginCalls,
	];

	return [
		...imports,
		"",
		"export default defineConfig({",
		"  plugins: [",
		...pluginCalls.map((call) => `    ${call},`),
		"  ],",
		"});",
	].join("\n");
}

export const vite = createPlugin("vite", {
	label: "Vite",
	implicit: true,
	events: ["ViteConfigured"],

	config(options: ViteOptions = {}) {
		return options;
	},

	register(ctx, bus, events) {
		bus.on(Dev.Configure, (_p) => {
			// Framework plugins push into p.vitePlugins/viteImports/vitePluginCalls before this runs.
			// Vite reads the collected values in Dev.Start.
		});

		bus.on(Dev.Start, async (p) => {
			const [configPayload] = bus.history(Dev.Configure);
			if (!configPayload) return;

			const { writeFileSync, mkdirSync } = await import("node:fs");
			mkdirSync(join(ctx.cwd, ".stack"), { recursive: true });

			const configContent = buildViteConfig(configPayload);
			writeFileSync(join(ctx.cwd, ".stack/vite.config.ts"), configContent);

			const port = ctx.options?.port ?? 3000;
			p.processes.push({
				name: "vite",
				command: "npx",
				args: [
					"vite",
					"dev",
					"--config",
					".stack/vite.config.ts",
					"--port",
					String(port),
				],
				readyPattern: /Local:/,
				color: "cyan",
			});

			await bus.emit(events.ViteConfigured, undefined);
		});

		bus.on(Build.Start, async (p) => {
			const [configPayload] = bus.history(Build.Configure);

			const { writeFileSync, mkdirSync } = await import("node:fs");
			mkdirSync(join(ctx.cwd, ".stack"), { recursive: true });

			const configContent = buildViteConfig(
				configPayload ?? { viteImports: [], vitePluginCalls: [] },
			);
			writeFileSync(join(ctx.cwd, ".stack/vite.config.ts"), configContent);

			p.steps.push({
				name: "vite-build",
				phase: "main",
				exec: {
					command: "npx",
					args: [
						"vite",
						"build",
						"--config",
						".stack/vite.config.ts",
						"--outDir",
						"dist/client",
					],
				},
			});
		});
	},
});

export type { ViteOptions } from "./types";
