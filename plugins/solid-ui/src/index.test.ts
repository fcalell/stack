import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
	it("contributes a home scaffold spec on Init.Scaffold", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solidUi.cli.register(ctx, bus, {});

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

		// The template on disk contains the UI-rich Card import.
		if (home) {
			const content = readFileSync(fileURLToPath(home.source), "utf8");
			expect(content).toContain("Card");
		}

		expect(scaffold.dependencies["@fcalell/ui"]).toBe("workspace:*");
	});

	it("solid + solid-ui: plugin-solid yields to solid-ui for the home page", async () => {
		const bus = createEventBus();

		// Register solid first — when ctx.hasPlugin("solid-ui") is true, it
		// contributes no scaffold (solid-ui owns the home page).
		const { solid } = await import("@fcalell/plugin-solid");
		const solidCtx = createMockCtx({
			hasPlugin: (name: string) => name === "solid-ui",
		});
		solid.cli.register(solidCtx, bus, solid.events);

		// Register solid-ui second.
		const uiCtx = createMockCtx();
		solidUi.cli.register(uiCtx, bus, {});

		const scaffold = await bus.emit(Init.Scaffold, {
			files: [],
			dependencies: {},
			devDependencies: {},
			gitignore: [],
		});

		const homes = scaffold.files.filter(
			(f) => f.target === "src/app/pages/index.tsx",
		);
		// Exactly one — solid-ui's rich version. No duplicate target to trip
		// writeScaffoldSpecs.
		expect(homes).toHaveLength(1);
		// The one survivor is solid-ui's rich template.
		expect(homes[0]?.source.pathname).toContain("solid-ui/templates/home.tsx");
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
