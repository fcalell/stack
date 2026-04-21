import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createEventBus, Init, Remove } from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { vite } from "@fcalell/plugin-vite";
import { describe, expect, it } from "vitest";
import { solidUi } from "./index";
import type { FontEntry } from "./node/fonts";

const inter: FontEntry = {
	family: "Inter Variable",
	specifier: "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
	weight: "100 900",
	style: "normal",
	role: "sans",
	fallback: {
		family: "sans-serif",
		ascentOverride: "90%",
		descentOverride: "22%",
		lineGapOverride: "0%",
		sizeAdjust: "107%",
	},
};

const jetbrains: FontEntry = {
	family: "JetBrains Mono Variable",
	specifier:
		"@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
	weight: "100 800",
	style: "normal",
	role: "mono",
	fallback: {
		family: "monospace",
		ascentOverride: "90%",
		descentOverride: "22%",
		lineGapOverride: "0%",
		sizeAdjust: "100%",
	},
};

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

	it("runs after solid.events.SolidConfigured", () => {
		expect(solidUi.cli.after).toHaveLength(1);
		expect(solidUi.cli.after[0]?.source).toBe("solid");
	});
});

describe("solidUi register", () => {
	it("contributes a home scaffold spec on Init.Scaffold", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solidUi.cli.register(ctx, bus, solidUi.events);

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
		solidUi.cli.register(uiCtx, bus, solidUi.events);

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

	it("contributes themeFontsPlugin with defaultFonts on vite.events.ViteConfig", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solidUi.cli.register(ctx, bus, solidUi.events);

		const cfg = await bus.emit(vite.events.ViteConfig, {
			imports: [],
			pluginCalls: [],
			resolveAliases: [],
			devServerPort: 0,
		});

		expect(cfg.imports).toContainEqual(
			expect.objectContaining({
				source: "@fcalell/plugin-solid-ui/node/fonts",
				named: ["themeFontsPlugin"],
			}),
		);
		const fontsCall = cfg.pluginCalls.find(
			(c) =>
				c.kind === "call" &&
				c.callee.kind === "identifier" &&
				c.callee.name === "themeFontsPlugin",
		);
		if (fontsCall?.kind !== "call") throw new Error("expected call");
		expect(fontsCall.args).toHaveLength(1);
		const arg = fontsCall.args[0];
		if (arg?.kind !== "array") throw new Error("expected array");
		// defaultFonts ships one entry (JetBrains Mono)
		expect(arg.items).toHaveLength(1);
	});

	it("inlines custom fonts into themeFontsPlugin args", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({ options: { fonts: [inter, jetbrains] } });
		solidUi.cli.register(ctx, bus, solidUi.events);

		const cfg = await bus.emit(vite.events.ViteConfig, {
			imports: [],
			pluginCalls: [],
			resolveAliases: [],
			devServerPort: 0,
		});

		const fontsCall = cfg.pluginCalls.find(
			(c) =>
				c.kind === "call" &&
				c.callee.kind === "identifier" &&
				c.callee.name === "themeFontsPlugin",
		);
		if (fontsCall?.kind !== "call") throw new Error("expected call");
		const arg = fontsCall.args[0];
		if (arg?.kind !== "array") throw new Error("expected array");
		expect(arg.items).toHaveLength(2);
		const first = arg.items[0];
		if (first?.kind !== "object") throw new Error("expected object");
		expect(first.properties).toContainEqual(
			expect.objectContaining({
				key: "family",
				value: { kind: "string", value: "Inter Variable" },
			}),
		);
	});

	it("contributes --ui-font-* layer on solidUi.events.AppCss for fonts with roles", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({ options: { fonts: [inter, jetbrains] } });
		solidUi.cli.register(ctx, bus, solidUi.events);

		const css = await bus.emit(solidUi.events.AppCss, {
			imports: [],
			layers: [],
		});

		expect(css.imports).toContain("@fcalell/plugin-solid-ui/globals.css");
		expect(css.layers).toHaveLength(1);
		const layer = css.layers[0];
		expect(layer?.name).toBe("base");
		expect(layer?.content).toContain(
			'--ui-font-sans: "Inter Variable", "Inter Variable Fallback"',
		);
		expect(layer?.content).toContain(
			'--ui-font-mono: "JetBrains Mono Variable", "JetBrains Mono Variable Fallback"',
		);
	});

	it("omits --ui-font-* layer when no fonts have roles", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({
			options: { fonts: [{ ...inter, role: undefined }] },
		});
		solidUi.cli.register(ctx, bus, solidUi.events);

		const css = await bus.emit(solidUi.events.AppCss, {
			imports: [],
			layers: [],
		});

		expect(css.layers).toHaveLength(0);
	});

	it("on Remove, unwires tailwindcss and leaves src/app/ to plugin-solid", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solidUi.cli.register(ctx, bus, solidUi.events);

		const removal = await bus.emit(Remove, {
			files: [],
			dependencies: [],
			devDependencies: [],
		});
		// Should NOT delete src/app/ — plugin-solid owns that.
		expect(removal.files).not.toContain("src/app/");
		// Tailwind is a consumer-facing dependency of plugin-solid-ui, so it
		// unwires on remove; `@tailwindcss/vite` is a devDependency.
		expect(removal.dependencies).toContain("tailwindcss");
		expect(removal.devDependencies).toContain("@tailwindcss/vite");
	});
});
