import { join } from "node:path";
import { createPlugin, fromSchema } from "@fcalell/cli";
import { generateViteConfig } from "@fcalell/cli/codegen";
import {
	Build,
	Codegen,
	Dev,
	type ViteImportSpec,
	type VitePluginCallSpec,
} from "@fcalell/cli/events";
import { type ViteOptions, viteOptionsSchema } from "./types";

export const vite = createPlugin("vite", {
	label: "Vite",
	implicit: true,
	events: ["ViteConfigured"],

	config: fromSchema<ViteOptions>(viteOptionsSchema),

	register(ctx, bus, events) {
		bus.on(Codegen.Frontend, (p) => {
			p.port = ctx.options?.port ?? 3000;
		});

		// Dev.ConfigureReady / Build.ConfigureReady fire AFTER Dev.Configure /
		// Build.Configure with the fully-populated payload, so we can write the
		// generated vite config without depending on handler registration order.
		async function writeViteConfig(configPayload: {
			viteImports: ViteImportSpec[];
			vitePluginCalls: VitePluginCallSpec[];
		}): Promise<void> {
			const { writeFileSync, mkdirSync } = await import("node:fs");
			mkdirSync(join(ctx.cwd, ".stack"), { recursive: true });
			const configContent = generateViteConfig(configPayload);
			writeFileSync(join(ctx.cwd, ".stack/vite.config.ts"), configContent);
		}

		bus.on(Dev.ConfigureReady, async (p) => {
			await writeViteConfig(p);
		});

		bus.on(Dev.Start, async (p) => {
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

			await bus.emit(events.ViteConfigured);
		});

		bus.on(Build.ConfigureReady, async (p) => {
			await writeViteConfig(p);
		});

		bus.on(Build.Start, (p) => {
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
