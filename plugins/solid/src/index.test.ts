import {
	Build,
	createEventBus,
	Dev,
	Generate,
	Init,
	Remove,
} from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { describe, expect, it, vi } from "vitest";
import { type SolidOptions, solid } from "./index";

const writeRoutesDtsMock = vi.fn();

vi.mock("./node/routes-core", async () => {
	const actual =
		await vi.importActual<typeof import("./node/routes-core")>(
			"./node/routes-core",
		);
	return {
		...actual,
		writeRoutesDts: (...args: unknown[]) => writeRoutesDtsMock(...args),
	};
});

vi.mock("vite-plugin-solid", () => ({
	default: () => ({ name: "vite-plugin-solid" }),
}));

vi.mock("./node/vite-routes", () => ({
	routesPlugin: () => ({ name: "fcalell:routes" }),
}));

describe("solid config factory", () => {
	it("returns PluginConfig with __plugin 'solid'", () => {
		const config = solid();
		expect(config.__plugin).toBe("solid");
	});

	it("defaults to empty options", () => {
		const config = solid();
		expect(config.options).toEqual({});
	});

	it("accepts routes config", () => {
		const config = solid({ routes: { pagesDir: "src/pages" } });
		expect(config.options.routes).toEqual({ pagesDir: "src/pages" });
	});

	it("accepts routes: false to disable routing", () => {
		const config = solid({ routes: false });
		expect(config.options.routes).toBe(false);
	});
});

describe("solid.events", () => {
	it("exposes SolidConfigured event", () => {
		expect(solid.events.SolidConfigured.source).toBe("solid");
		expect(solid.events.SolidConfigured.name).toBe("SolidConfigured");
	});
});

describe("solid.cli", () => {
	it("has correct name and label", () => {
		expect(solid.cli.name).toBe("solid");
		expect(solid.cli.label).toBe("SolidJS");
	});

	it("depends on vite.events.ViteConfigured", () => {
		expect(solid.cli.depends).toHaveLength(1);
		expect(solid.cli.depends[0]?.source).toBe("vite");
	});
});

describe("solid register", () => {
	it("pushes scaffold files on Init.Scaffold", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solid.cli.register(ctx, bus, solid.events);

		const scaffold = await bus.emit(Init.Scaffold, {
			files: [],
			dependencies: {},
			devDependencies: {},
			gitignore: [],
		});

		expect(scaffold.files).toContainEqual(
			expect.objectContaining({ path: "src/app/pages/_layout.tsx" }),
		);
		expect(scaffold.files).toContainEqual(
			expect.objectContaining({ path: "src/app/pages/index.tsx" }),
		);
		expect(scaffold.dependencies["@fcalell/plugin-solid"]).toBe("workspace:*");
		expect(scaffold.dependencies["solid-js"]).toBeDefined();
	});

	it("pushes cleanup info on Remove", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solid.cli.register(ctx, bus, solid.events);

		const removal = await bus.emit(Remove, {
			files: [],
			dependencies: [],
		});
		expect(removal.files).toContain("src/app/");
		expect(removal.dependencies).toContain("@fcalell/plugin-solid");
	});

	it("injects vite plugins on Dev.Configure", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solid.cli.register(ctx, bus, solid.events);

		const config = await bus.emit(Dev.Configure, {
			vitePlugins: [],
			viteImports: [],
			vitePluginCalls: [],
		});
		expect(config.vitePlugins.length).toBeGreaterThan(0);
		expect(config.viteImports.length).toBeGreaterThan(0);
		expect(config.vitePluginCalls.length).toBeGreaterThan(0);
	});

	it("injects vite plugins on Build.Configure", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solid.cli.register(ctx, bus, solid.events);

		const config = await bus.emit(Build.Configure, {
			vitePlugins: [],
			viteImports: [],
			vitePluginCalls: [],
		});
		expect(config.vitePlugins.length).toBeGreaterThan(0);
		expect(config.viteImports.length).toBeGreaterThan(0);
		expect(config.vitePluginCalls.length).toBeGreaterThan(0);
	});

	it("writes routes dts on Generate via writeRoutesDts", async () => {
		writeRoutesDtsMock.mockClear();
		const bus = createEventBus();
		const ctx = createMockCtx();
		solid.cli.register(ctx, bus, solid.events);

		const gen = await bus.emit(Generate, { files: [], bindings: [] });
		expect(writeRoutesDtsMock).toHaveBeenCalledWith(
			"/tmp/test",
			"src/app/pages",
		);
		expect(gen.files).not.toContainEqual(
			expect.objectContaining({ path: ".stack/routes.d.ts" }),
		);
	});

	it("passes custom pagesDir to writeRoutesDts", async () => {
		writeRoutesDtsMock.mockClear();
		const bus = createEventBus();
		const ctx = createMockCtx<SolidOptions>({
			options: { routes: { pagesDir: "src/pages" } },
		});
		solid.cli.register(ctx, bus, solid.events);

		await bus.emit(Generate, { files: [], bindings: [] });
		expect(writeRoutesDtsMock).toHaveBeenCalledWith("/tmp/test", "src/pages");
	});

	it("skips route generation when routes: false", async () => {
		writeRoutesDtsMock.mockClear();
		const bus = createEventBus();
		const ctx = createMockCtx<SolidOptions>({ options: { routes: false } });
		solid.cli.register(ctx, bus, solid.events);

		await bus.emit(Generate, { files: [], bindings: [] });
		expect(writeRoutesDtsMock).not.toHaveBeenCalled();
	});
});
