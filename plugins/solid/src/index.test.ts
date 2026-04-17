import type { RegisterContext } from "@fcalell/cli";
import {
	Build,
	createEventBus,
	Dev,
	Generate,
	Init,
	Remove,
} from "@fcalell/cli/events";
import { describe, expect, it, vi } from "vitest";
import { type SolidOptions, solid } from "./index";

vi.mock("fast-glob", () => ({
	default: { sync: () => ["index.tsx", "_layout.tsx"] },
}));

vi.mock("vite-plugin-solid", () => ({
	default: () => ({ name: "vite-plugin-solid" }),
}));

vi.mock("./node/vite-routes", () => ({
	routesPlugin: () => ({ name: "fcalell:routes" }),
}));

function createMockCtx(
	overrides?: Partial<RegisterContext<SolidOptions>> & {
		options?: SolidOptions;
	},
): RegisterContext<SolidOptions> {
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

	it("generates route types on Generate", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solid.cli.register(ctx, bus, solid.events);

		const gen = await bus.emit(Generate, { files: [], bindings: [] });
		const routesDts = gen.files.find((f) => f.path === ".stack/routes.d.ts");
		expect(routesDts).toBeDefined();
		expect(routesDts?.content).toContain("virtual:fcalell-routes");
		expect(routesDts?.content).toContain("@fcalell/plugin-solid");
		expect(routesDts?.content).toContain("RouteDefinition");
	});

	it("skips route generation when routes: false", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({ options: { routes: false } });
		solid.cli.register(ctx, bus, solid.events);

		const gen = await bus.emit(Generate, { files: [], bindings: [] });
		expect(gen.files).not.toContainEqual(
			expect.objectContaining({ path: ".stack/routes.d.ts" }),
		);
	});
});
