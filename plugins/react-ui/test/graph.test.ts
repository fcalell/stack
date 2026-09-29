import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { react } from "@fcalell/plugin-react";
import { vite } from "@fcalell/plugin-vite";
import { ENGLISH } from "@fcalell/ui-core/tokens";
import { type ReactUiOptions, reactUi } from "../src/index.ts";

// The graph `stack generate` resolves for vite + react + react-ui.
function graph(options: ReactUiOptions = {}) {
	const cwd = mkdtempSync(join(tmpdir(), "stack-react-ui-"));
	const plugins = [
		{ factory: vite, config: vite() },
		{ factory: react, config: react() },
		{ factory: reactUi, config: reactUi(options) },
	];
	const discovered = plugins.map(
		({ factory, config }) =>
			({
				name: config.__plugin,
				cli: factory.cli,
				factory,
				options: config.options,
			}) as unknown as DiscoveredPlugin,
	);
	return buildGraphFromDiscovered({
		discovered,
		app: { name: "shop", domain: "example.com" },
		cwd,
	}).graph;
}

async function artifacts(
	options: ReactUiOptions = {},
): Promise<Map<string, string>> {
	const files = await graph(options).resolve(cliSlots.artifactFiles);
	return new Map(files.map((f) => [f.path, f.content]));
}

test("app.css imports Tailwind without detection, then the web sheet, then the contract", async () => {
	const css = (await artifacts()).get(".stack/app.css") ?? "";
	assert.match(css, /^@import "tailwindcss" source\(none\);/);
	assert.match(css, /@import "@fcalell\/plugin-react-ui\/globals\.css";/);
	assert.match(css, /@source "\.\.\/src";/);
	assert.match(css, /@theme \{[^}]*--spacing-floor: 44px;/);
	assert.match(css, /@utility shadow-/);
	assert.match(css, /\.dark \{\n\tcolor-scheme: dark;/);
	assert.match(css, /\.light \{\n\tcolor-scheme: light;/);
	assert.match(css, /--transition-duration-base: 200ms;/);
	assert.match(css, /--ease-out: cubic-bezier\(0\.33, 1, 0\.68, 1\);/);
	assert.match(
		css,
		/@media \(prefers-reduced-motion: reduce\) \{\n:root \{\n\t--transition-duration-instant: 0ms;/,
	);
	assert.match(
		(await artifacts()).get(".stack/entry.tsx") ?? "",
		/import "\.\/app\.css";/,
	);
});

test("Inter is the default sans while its file loads, and a theme's own sans wins", async () => {
	const css = (await artifacts()).get(".stack/app.css") ?? "";
	assert.match(
		css,
		/--font-sans: "Inter Variable", "Inter Variable Fallback", ui-sans-serif/,
	);
	const own = (await artifacts({ theme: { fonts: { sans: "Geist" } } })).get(
		".stack/app.css",
	);
	assert.match(
		own ?? "",
		/--font-sans: "Geist", "Geist Fallback", ui-sans-serif/,
	);
	const none = (await artifacts({ fonts: [] })).get(".stack/app.css");
	assert.match(none ?? "", /--font-sans: ui-sans-serif/);
});

test("data-density pins either set whatever the knob; the pointer query only under desktop", async () => {
	const touch = (await artifacts()).get(".stack/app.css") ?? "";
	assert.match(
		touch,
		/:root\[data-density="desktop"\] \{\n\t--spacing-floor: 32px;/,
	);
	assert.doesNotMatch(touch, /pointer: fine/);
	const desktop =
		(await artifacts({ theme: { density: "desktop" } })).get(
			".stack/app.css",
		) ?? "";
	assert.match(
		desktop,
		/@media \(pointer: fine\) \{\n:root \{\n\t--spacing-floor: 32px;/,
	);
	assert.match(
		desktop,
		/@media \(pointer: fine\) \{\n:root\[data-density="touch"\] \{\n\t--spacing-floor: 44px;/,
	);
});

test("the vite config runs Tailwind, the fonts and the mode script", async () => {
	const config =
		(await artifacts({ theme: { defaultMode: "dark" } })).get(
			".stack/vite.config.ts",
		) ?? "";
	assert.match(config, /import tailwindcss from "@tailwindcss\/vite";/);
	assert.match(config, /tailwindcss\(\)/);
	assert.match(config, /themeModePlugin\("dark"\)/);
	assert.match(
		config,
		/specifier: "@fontsource-variable\/inter\/files\/inter-latin-opsz-normal\.woff2"/,
	);
	assert.match(config, /import\.meta\.resolve\("@fcalell\/plugin-react-ui"\)/);
});

test("words mount a provider only when given", async () => {
	const bare = (await artifacts()).get(".stack/virtual-providers.tsx");
	assert.doesNotMatch(bare ?? "", /WordsProvider/);
	const words = (
		await artifacts({ words: { ...ENGLISH, back: "Zurück" } })
	).get(".stack/virtual-providers.tsx");
	assert.match(words ?? "", /from "@fcalell\/plugin-react-ui\/lib\/words"/);
	assert.match(words ?? "", /back: "Zurück"/);
});

test("the geometry gate runs before the build", async () => {
	const steps = await graph().resolve(cliSlots.buildSteps);
	const gate = steps.find((step) => step.name === "react-ui-geometry-gate");
	assert.equal(gate?.phase, "pre");
});
