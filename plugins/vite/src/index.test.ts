import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Build, createEventBus, Dev } from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
	let tempCwd: string;

	beforeEach(() => {
		tempCwd = mkdtempSync(join(tmpdir(), "vite-plugin-test-"));
	});

	afterEach(() => {
		rmSync(tempCwd, { recursive: true, force: true });
	});

	it("pushes vite dev process on Dev.Start", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({ cwd: tempCwd });
		vite.cli.register(ctx, bus, vite.events);

		const configured = await bus.emit(Dev.Configure, {
			vitePlugins: [],
			viteImports: [],
			vitePluginCalls: [],
		});
		await bus.emit(Dev.ConfigureReady, configured);
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

	it("uses custom port from options", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({ cwd: tempCwd, options: { port: 4000 } });
		vite.cli.register(ctx, bus, vite.events);

		const configured = await bus.emit(Dev.Configure, {
			vitePlugins: [],
			viteImports: [],
			vitePluginCalls: [],
		});
		await bus.emit(Dev.ConfigureReady, configured);
		const start = await bus.emit(Dev.Start, {
			processes: [],
			watchers: [],
		});

		const viteProcess = start.processes.find((p) => p.name === "vite");
		expect(viteProcess?.args).toContain("4000");
	});

	it("writes .stack/vite.config.ts on Dev.ConfigureReady with contributor payload", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({ cwd: tempCwd });
		vite.cli.register(ctx, bus, vite.events);

		const configured = await bus.emit(Dev.Configure, {
			vitePlugins: [],
			viteImports: ['import solidPlugin from "vite-plugin-solid";'],
			vitePluginCalls: ["solidPlugin()"],
		});
		await bus.emit(Dev.ConfigureReady, configured);

		const written = readFileSync(
			join(tempCwd, ".stack/vite.config.ts"),
			"utf8",
		);
		expect(written).toContain('import solidPlugin from "vite-plugin-solid";');
		expect(written).toContain("solidPlugin()");
	});

	it("pushes vite build step on Build.Start", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({ cwd: tempCwd });
		vite.cli.register(ctx, bus, vite.events);

		const configured = await bus.emit(Build.Configure, {
			vitePlugins: [],
			viteImports: [],
			vitePluginCalls: [],
		});
		await bus.emit(Build.ConfigureReady, configured);
		const start = await bus.emit(Build.Start, { steps: [] });

		expect(start.steps).toContainEqual(
			expect.objectContaining({
				name: "vite-build",
				phase: "main",
			}),
		);
	});

	it("writes .stack/vite.config.ts on Build.ConfigureReady with contributor payload", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({ cwd: tempCwd });
		vite.cli.register(ctx, bus, vite.events);

		const configured = await bus.emit(Build.Configure, {
			vitePlugins: [],
			viteImports: ['import solidPlugin from "vite-plugin-solid";'],
			vitePluginCalls: ["solidPlugin()"],
		});
		await bus.emit(Build.ConfigureReady, configured);

		const written = readFileSync(
			join(tempCwd, ".stack/vite.config.ts"),
			"utf8",
		);
		expect(written).toContain('import solidPlugin from "vite-plugin-solid";');
		expect(written).toContain("solidPlugin()");
	});
});
