import { createPlugin, type } from "@fcalell/cli";
import { Build, Dev, Generate } from "@fcalell/cli/events";
import { api } from "@fcalell/plugin-api";
import { aggregateViteConfig } from "./node/codegen";
import { type CodegenViteConfigPayload, viteOptionsSchema } from "./types";

export const vite = createPlugin("vite", {
	label: "Vite",
	events: {
		ViteConfigured: type<void>(),
		ViteConfig: type<CodegenViteConfigPayload>(),
	},

	schema: viteOptionsSchema,

	register(ctx, bus, events) {
		bus.on(events.ViteConfig, (p) => {
			const port = ctx.options?.port ?? 3000;
			p.devServerPort = port;
			p.imports.push({
				source: "@fcalell/plugin-vite/preset",
				named: ["providersPlugin"],
			});
			p.pluginCalls.push({
				kind: "call",
				callee: { kind: "identifier", name: "providersPlugin" },
				args: [],
			});
		});

		// Contribute the dev-server localhost origin to CORS unless the
		// consumer has overridden `app.origins` entirely. Mirrors the
		// pre-Phase-4 behavior the CLI used to inline.
		bus.on(api.events.Worker, (p) => {
			if (ctx.app.origins) return;
			const port = ctx.options?.port ?? 3000;
			const origin = `http://localhost:${port}`;
			if (!p.cors.includes(origin)) p.cors.push(origin);
		});

		// ViteConfigured fires during Generate — after the ViteConfig payload has
		// been collected — so downstream plugins (`after: [vite.events.ViteConfigured]`)
		// see the signal across generate/dev/build alike. The file is emitted into
		// Generate's `files` accumulator; the CLI writes them after Generate
		// resolves.
		bus.on(Generate, async (p) => {
			const payload = await bus.emit(events.ViteConfig, {
				imports: [],
				pluginCalls: [],
				resolveAliases: [],
				devServerPort: 0,
			});
			if (payload.pluginCalls.length > 0 || payload.imports.length > 0) {
				p.files.push({
					path: ".stack/vite.config.ts",
					content: aggregateViteConfig(payload),
				});
			}
			await bus.emit(events.ViteConfigured);
		});

		bus.on(Dev.Start, (p) => {
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
