import { createEventBus, Init, Remove } from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { describe, expect, it } from "vitest";
import { solidUi } from "./index";

describe("solidUi config factory", () => {
	it("returns PluginConfig with __plugin 'solid-ui'", () => {
		const config = solidUi();
		expect(config.__plugin).toBe("solid-ui");
	});
});

describe("solidUi.cli", () => {
	it("has correct name and label", () => {
		expect(solidUi.cli.name).toBe("solid-ui");
		expect(solidUi.cli.label).toBe("Design System");
	});

	it("depends on solid.events.SolidConfigured", () => {
		expect(solidUi.cli.depends).toHaveLength(1);
		expect(solidUi.cli.depends[0]?.source).toBe("solid");
	});
});

describe("solidUi register", () => {
	it("pushes UI-rich scaffold files on Init.Scaffold", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solidUi.cli.register(ctx, bus, {});

		const scaffold = await bus.emit(Init.Scaffold, {
			files: [],
			dependencies: {},
			devDependencies: {},
			gitignore: [],
		});

		const layout = scaffold.files.find(
			(f) => f.path === "src/app/pages/_layout.tsx",
		);
		expect(layout?.content).toContain("Toaster");

		const index = scaffold.files.find(
			(f) => f.path === "src/app/pages/index.tsx",
		);
		expect(index?.content).toContain("Card");

		expect(scaffold.files).toContainEqual(
			expect.objectContaining({ path: "src/app/app.css" }),
		);
		expect(scaffold.dependencies["@fcalell/ui"]).toBe("workspace:*");
	});

	it("template override: solid-ui templates win over solid's", async () => {
		const bus = createEventBus();

		// Register solid first (bare templates)
		const { solid } = await import("@fcalell/plugin-solid");
		const solidCtx = createMockCtx();
		solid.cli.register(solidCtx, bus, solid.events);

		// Register solid-ui second (rich templates)
		const uiCtx = createMockCtx();
		solidUi.cli.register(uiCtx, bus, {});

		const scaffold = await bus.emit(Init.Scaffold, {
			files: [],
			dependencies: {},
			devDependencies: {},
			gitignore: [],
		});

		// Both push to the same paths, but solid-ui registered later
		const layouts = scaffold.files.filter(
			(f) => f.path === "src/app/pages/_layout.tsx",
		);
		// Last writer wins
		const finalLayout = layouts[layouts.length - 1];
		expect(finalLayout?.content).toContain("Toaster");
	});

	it("pushes cleanup info on Remove", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solidUi.cli.register(ctx, bus, {});

		const removal = await bus.emit(Remove, {
			files: [],
			dependencies: [],
		});
		expect(removal.dependencies).toContain("@fcalell/ui");
		// Should NOT delete src/app/ — plugin-solid owns that
		expect(removal.files).not.toContain("src/app/");
	});
});
