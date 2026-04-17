import type { RegisterContext } from "@fcalell/cli";
import { Build, createEventBus, Dev } from "@fcalell/cli/events";
import { describe, expect, it, vi } from "vitest";
import { type ViteOptions, vite } from "./index";

function createMockCtx(
	overrides?: Partial<RegisterContext<ViteOptions>> & { options?: ViteOptions },
): RegisterContext<ViteOptions> {
	return {
		cwd: "/tmp/test",
		options: {},
		hasPlugin: () => false,
		readFile: vi.fn(async () => ""),
		fileExists: vi.fn(async () => false),
		log: {
			info: vi.fn(),
			warn: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
		},
		prompt: {
			text: vi.fn(async () => ""),
			confirm: vi.fn(async () => false),
			select: vi.fn(async () => undefined as never),
			multiselect: vi.fn(async () => []),
		},
		...overrides,
	};
}

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

		await bus.emit(Dev.Configure, {
			vitePlugins: [],
			viteImports: [],
			vitePluginCalls: [],
		});
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
		const ctx = createMockCtx({ options: { port: 4000 } });
		vite.cli.register(ctx, bus, vite.events);

		await bus.emit(Dev.Configure, {
			vitePlugins: [],
			viteImports: [],
			vitePluginCalls: [],
		});
		const start = await bus.emit(Dev.Start, {
			processes: [],
			watchers: [],
		});

		const viteProcess = start.processes.find((p) => p.name === "vite");
		expect(viteProcess?.args).toContain("4000");
	});

	it("pushes vite build step on Build.Start", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		vite.cli.register(ctx, bus, vite.events);

		await bus.emit(Build.Configure, {
			vitePlugins: [],
			viteImports: [],
			vitePluginCalls: [],
		});
		const start = await bus.emit(Build.Start, { steps: [] });

		expect(start.steps).toContainEqual(
			expect.objectContaining({
				name: "vite-build",
				phase: "main",
			}),
		);
	});
});
