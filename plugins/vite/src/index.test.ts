import { Build, Codegen, createEventBus, Dev } from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { describe, expect, it } from "vitest";
import { vite } from "./index";

describe("vite config factory", () => {
	it("returns PluginConfig with __plugin 'vite'", () => {
		const config = vite();
		expect(config.__plugin).toBe("vite");
	});

	it("accepts custom port", () => {
		const config = vite({ port: 4000 });
		expect(config.options.port).toBe(4000);
	});

	it("defaults to empty options", () => {
		const config = vite();
		expect(config.options).toEqual({});
	});
});

describe("vite.events", () => {
	it("exposes ViteConfigured event", () => {
		expect(vite.events.ViteConfigured.source).toBe("vite");
		expect(vite.events.ViteConfigured.name).toBe("ViteConfigured");
	});
});

describe("vite.cli", () => {
	it("has correct name and label", () => {
		expect(vite.cli.name).toBe("vite");
		expect(vite.cli.label).toBe("Vite");
	});

	it("has no depends", () => {
		expect(vite.cli.depends).toHaveLength(0);
	});
});

describe("vite register", () => {
	it("pushes vite dev process on Dev.Start", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		vite.cli.register(ctx, bus, vite.events);

		const start = await bus.emit(Dev.Start, {
			processes: [],
			watchers: [],
		});

		expect(start.processes).toContainEqual(
			expect.objectContaining({
				name: "vite",
				command: "npx",
			}),
		);
	});

	it("uses custom port from options on Dev.Start args", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({ options: { port: 4000 } });
		vite.cli.register(ctx, bus, vite.events);

		const start = await bus.emit(Dev.Start, {
			processes: [],
			watchers: [],
		});

		const viteProcess = start.processes.find((p) => p.name === "vite");
		expect(viteProcess?.args).toContain("4000");
	});

	it("contributes tailwind + theme-fonts imports on Codegen.ViteConfig", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		vite.cli.register(ctx, bus, vite.events);

		const cfg = await bus.emit(Codegen.ViteConfig, {
			imports: [],
			pluginCalls: [],
			resolveAliases: [],
			devServerPort: 0,
		});

		expect(cfg.imports).toContainEqual(
			expect.objectContaining({
				source: "@tailwindcss/vite",
				default: "tailwindcss",
			}),
		);
		expect(cfg.imports).toContainEqual(
			expect.objectContaining({
				source: "@fcalell/plugin-vite/preset",
				named: ["themeFontsPlugin", "providersPlugin"],
			}),
		);
		expect(cfg.devServerPort).toBe(3000);
	});

	it("uses custom port for Codegen.ViteConfig devServerPort", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({ options: { port: 4000 } });
		vite.cli.register(ctx, bus, vite.events);

		const cfg = await bus.emit(Codegen.ViteConfig, {
			imports: [],
			pluginCalls: [],
			resolveAliases: [],
			devServerPort: 0,
		});

		expect(cfg.devServerPort).toBe(4000);
	});

	it("contributes localhost origin to Codegen.Worker cors", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		vite.cli.register(ctx, bus, vite.events);

		const worker = await bus.emit(Codegen.Worker, {
			imports: [],
			base: null,
			middlewareChain: [],
			handler: null,
			domain: "",
			cors: [],
		});

		expect(worker.cors).toContain("http://localhost:3000");
	});

	it("pushes vite build step on Build.Start", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		vite.cli.register(ctx, bus, vite.events);

		const start = await bus.emit(Build.Start, { steps: [] });

		expect(start.steps).toContainEqual(
			expect.objectContaining({
				name: "vite-build",
				phase: "main",
			}),
		);
	});
});
