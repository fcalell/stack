import {
	Codegen,
	createEventBus,
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
	it("contributes the home scaffold on Init.Scaffold", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solid.cli.register(ctx, bus, solid.events);

		const scaffold = await bus.emit(Init.Scaffold, {
			files: [],
			dependencies: {},
			devDependencies: {},
			gitignore: [],
		});

		const home = scaffold.files.find(
			(f) => f.target === "src/app/pages/index.tsx",
		);
		expect(home).toBeDefined();
		expect(home?.source.pathname.endsWith("templates/home.tsx")).toBe(true);

		// Tier A files (entry.tsx / _layout.tsx / index.html / app.css) moved to
		// .stack/** in Phase 5 and are no longer scaffolded.
		expect(scaffold.files.some((f) => f.target === "src/app/entry.tsx")).toBe(
			false,
		);
		expect(
			scaffold.files.some((f) => f.target === "src/app/pages/_layout.tsx"),
		).toBe(false);
		expect(scaffold.files.some((f) => f.target === "index.html")).toBe(false);

		expect(scaffold.dependencies["@fcalell/plugin-solid"]).toBe("workspace:*");
		expect(scaffold.dependencies["solid-js"]).toBeDefined();
	});

	it("does not contribute the home scaffold when solid-ui is present", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({
			hasPlugin: (name: string) => name === "solid-ui",
		});
		solid.cli.register(ctx, bus, solid.events);

		const scaffold = await bus.emit(Init.Scaffold, {
			files: [],
			dependencies: {},
			devDependencies: {},
			gitignore: [],
		});

		expect(
			scaffold.files.some((f) => f.target === "src/app/pages/index.tsx"),
		).toBe(false);
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

	it("contributes vite plugins on Codegen.ViteConfig", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solid.cli.register(ctx, bus, solid.events);

		const cfg = await bus.emit(Codegen.ViteConfig, {
			imports: [],
			pluginCalls: [],
			resolveAliases: [],
			devServerPort: 3000,
		});
		expect(cfg.imports).toContainEqual(
			expect.objectContaining({
				source: "vite-plugin-solid",
				default: "solidPlugin",
			}),
		);
		expect(cfg.imports).toContainEqual(
			expect.objectContaining({
				source: "@fcalell/plugin-solid/node/vite-routes",
				named: ["routesPlugin"],
			}),
		);
		expect(cfg.pluginCalls.length).toBeGreaterThanOrEqual(2);
	});

	it("reports pagesDir via Codegen.RoutesDts", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<SolidOptions>({
			options: { routes: { pagesDir: "src/pages" } },
		});
		solid.cli.register(ctx, bus, solid.events);

		const routes = await bus.emit(Codegen.RoutesDts, { pagesDir: null });
		expect(routes.pagesDir).toBe("src/pages");
	});

	it("reports null pagesDir when routes: false", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<SolidOptions>({ options: { routes: false } });
		solid.cli.register(ctx, bus, solid.events);

		const routes = await bus.emit(Codegen.RoutesDts, { pagesDir: null });
		expect(routes.pagesDir).toBeNull();
	});

	it("writes routes dts on Generate via writeRoutesDts", async () => {
		writeRoutesDtsMock.mockClear();
		const bus = createEventBus();
		const ctx = createMockCtx();
		solid.cli.register(ctx, bus, solid.events);

		const gen = await bus.emit(Generate, { files: [] });
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

		await bus.emit(Generate, { files: [] });
		expect(writeRoutesDtsMock).toHaveBeenCalledWith("/tmp/test", "src/pages");
	});

	it("skips route generation when routes: false", async () => {
		writeRoutesDtsMock.mockClear();
		const bus = createEventBus();
		const ctx = createMockCtx<SolidOptions>({ options: { routes: false } });
		solid.cli.register(ctx, bus, solid.events);

		await bus.emit(Generate, { files: [] });
		expect(writeRoutesDtsMock).not.toHaveBeenCalled();
	});
});
