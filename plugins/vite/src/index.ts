import { createPlugin, fromSchema } from "@fcalell/cli";
import { Build, Codegen, Dev } from "@fcalell/cli/events";
import { type ViteOptions, viteOptionsSchema } from "./types";

export const vite = createPlugin("vite", {
	label: "Vite",
	implicit: true,
	events: ["ViteConfigured"],

	config: fromSchema<ViteOptions>(viteOptionsSchema),

	register(ctx, bus, events) {
		bus.on(Codegen.ViteConfig, (p) => {
			const port = ctx.options?.port ?? 3000;
			p.devServerPort = port;
			p.imports.push({
				source: "@tailwindcss/vite",
				default: "tailwindcss",
			});
			p.imports.push({
				source: "@fcalell/plugin-vite/preset",
				named: ["providersPlugin"],
			});
			p.pluginCalls.push({
				kind: "call",
				callee: { kind: "identifier", name: "tailwindcss" },
				args: [],
			});
			p.pluginCalls.push({
				kind: "call",
				callee: { kind: "identifier", name: "providersPlugin" },
				args: [],
			});
		});

		bus.on(Codegen.Worker, (p) => {
			// Contribute a localhost origin so worker CORS includes the vite dev
			// server. Frontend plugins that run on their own port can layer on top.
			const port = ctx.options?.port ?? 3000;
			const origin = `http://localhost:${port}`;
			if (!p.cors.includes(origin)) p.cors.push(origin);
		});

		bus.on(Codegen.AppCss, (p) => {
			p.imports.push("tailwindcss");
		});

		bus.on(Codegen.Html, (p) => {
			p.shell = new URL("../templates/shell.html", import.meta.url);
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
