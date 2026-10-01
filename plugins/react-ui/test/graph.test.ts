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
	assert.match(
		css,
		/@source inline\("\{bg,text,border,outline,divide\}-\{canvas,surface,/,
	);
	assert.match(css, /@theme \{[^}]*--spacing-control: 44px;/);
	assert.match(css, /@utility shadow-/);
	assert.match(
		css,
		/@custom-variant touch \{\n:root\[data-density="touch"\] & \{\n\t@slot;\n\}\n@media not \(pointer: fine\) \{\n:root:not\(\[data-density="desktop"\]\) & \{\n\t@slot;\n\}\n\}\n\}/,
	);
	assert.match(css, /\.dark \{\n\tcolor-scheme: dark;/);
	assert.match(css, /\.light \{\n\tcolor-scheme: light;/);
	assert.match(css, /--transition-duration-base: 200ms;/);
	assert.match(css, /--ease-out: cubic-bezier\(0\.16, 1, 0\.3, 1\);/);
	assert.match(
		css,
		/@media \(prefers-reduced-motion: reduce\) \{\n:root \{\n\t--transition-duration-instant: 0ms;/,
	);
	assert.match(
		(await artifacts()).get(".stack/entry.tsx") ?? "",
		/import "\.\/app\.css";/,
	);
});

test("IBM Plex is the default pair, and a theme's own sans wins", async () => {
	const css = (await artifacts()).get(".stack/app.css") ?? "";
	assert.match(
		css,
		/--font-sans: "IBM Plex Sans", "IBM Plex Sans Fallback", ui-sans-serif/,
	);
	assert.match(
		css,
		/--font-mono: "IBM Plex Mono", "IBM Plex Mono Fallback", ui-monospace/,
	);
	const own = (await artifacts({ theme: { fonts: { sans: "Geist" } } })).get(
		".stack/app.css",
	);
	assert.match(
		own ?? "",
		/--font-sans: "Geist", "Geist Fallback", ui-sans-serif/,
	);
});

test("a fine pointer draws the desktop set, and data-density pins either", async () => {
	const desktop = (await artifacts()).get(".stack/app.css") ?? "";
	assert.match(
		desktop,
		/:root\[data-density="desktop"\] \{\n\t--text-display: 36px;/,
	);
	assert.match(
		desktop,
		/@media \(pointer: fine\) \{\n:root \{\n\t--text-display: 36px;/,
	);
	assert.match(
		desktop,
		/@media \(pointer: fine\) \{\n:root\[data-density="touch"\] \{\n\t--text-display: 44px;/,
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
		/specifier: "@fontsource-variable\/ibm-plex-sans\/files\/ibm-plex-sans-latin-wght-normal\.woff2"/,
	);
	assert.match(
		config,
		/specifier: "@fontsource\/ibm-plex-mono\/files\/ibm-plex-mono-latin-600-normal\.woff2"/,
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
