import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { type ReactOptions, react } from "@fcalell/plugin-react";
import { vite } from "@fcalell/plugin-vite";
import { ENGLISH } from "@fcalell/ui-core/tokens";
import { type ReactUiOptions, reactUi } from "../src/index.ts";

// The graph `stack generate` resolves for vite + react + react-ui.
function graph(options: ReactUiOptions = {}, reactOptions: ReactOptions = {}) {
	const cwd = mkdtempSync(join(tmpdir(), "stack-react-ui-"));
	const plugins = [
		{ factory: vite, config: vite() },
		{ factory: react, config: react(reactOptions) },
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
	reactOptions: ReactOptions = {},
): Promise<Map<string, string>> {
	const files = await graph(options, reactOptions).resolve(
		cliSlots.artifactFiles,
	);
	return new Map(files.map((f) => [f.path, f.content]));
}

// The default options' artifacts, built once for every test that reads them.
let built: Promise<Map<string, string>> | undefined;
const defaults = () => {
	built ??= artifacts();
	return built;
};

test("app.css imports Tailwind without detection, then the web sheet, then the contract", async () => {
	const css = (await defaults()).get(".stack/app.css") ?? "";
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
		/@custom-variant touch \{\n:root\[data-density="touch"\] & \{\n\t@slot;\n\}\n\[data-density="room"\] & \{\n\t@slot;\n\}\n@media not \(\(pointer: fine\) and \(width >= 768px\)\) \{\n:root:not\(\[data-density="desktop"\]\) & \{\n\t@slot;\n\}\n\}\n\}/,
	);
	assert.match(
		css,
		/@custom-variant page-max-tablet \{\n@container page \(width < 768px\) \{\n\t@slot;\n\}\n\}/,
	);
	assert.match(
		css,
		/@custom-variant page-wide \{\n@container page \(width >= 1200px\) \{\n\t@slot;\n\}\n\}/,
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
		(await defaults()).get(".stack/entry.tsx") ?? "",
		/import "\.\/app\.css";/,
	);
});

test("IBM Plex is the default pair, and a theme's own sans wins", async () => {
	const css = (await defaults()).get(".stack/app.css") ?? "";
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

test("a fine pointer at tablet width draws the desktop set, and data-density pins either", async () => {
	const desktop = (await defaults()).get(".stack/app.css") ?? "";
	assert.match(
		desktop,
		/:root\[data-density="desktop"\] \{\n\t--text-display: 36px;/,
	);
	assert.match(
		desktop,
		/@media \(pointer: fine\) and \(width >= 768px\) \{\n:root \{\n\t--text-display: 36px;/,
	);
	assert.match(
		desktop,
		/@media \(pointer: fine\) and \(width >= 768px\) \{\n:root\[data-density="touch"\] \{\n\t--text-display: 44px;/,
	);
});

test("a Place declaring a room scales the room set from its own unit", async () => {
	const css = (await defaults()).get(".stack/app.css") ?? "";
	assert.match(
		css,
		/\[data-density="room"\] \{\n\t--room-unit: max\(1px, min\(100vw \/ 960, 100dvh \/ 540\)\);/,
	);
	assert.match(css, /--text-body: calc\(16 \* var\(--room-unit\)\);/);
	assert.match(css, /--text-display: calc\(80 \* var\(--room-unit\)\);/);
	assert.match(css, /--spacing-page: calc\(48 \* var\(--room-unit\)\);/);
	assert.match(css, /--focus-ring: calc\(2 \* var\(--room-unit\)\);/);
	assert.match(css, /--hairline: calc\(1 \* var\(--room-unit\)\);/);
	assert.match(css, /--default-border-width: var\(--hairline\);/);
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
		/specifier: "@fontsource-variable\/ibm-plex-sans\/files\/ibm-plex-sans-latin-wght-italic\.woff2", weight: "100 700", style: "italic"/,
	);
	assert.match(
		config,
		/specifier: "@fontsource\/ibm-plex-mono\/files\/ibm-plex-mono-latin-600-normal\.woff2"/,
	);
	assert.match(config, /import\.meta\.resolve\("@fcalell\/plugin-react-ui"\)/);
	assert.equal(config.match(/from "node:url"/g)?.length, 1, config);
	assert.match(
		config,
		/import \{ defineConfig, searchForWorkspaceRoot \} from "vite";/,
	);
});

test("the dev server pre-bundles the roster's .tsx subpaths", async () => {
	const config = (await defaults()).get(".stack/vite.config.ts") ?? "";
	assert.match(config, /optimizeDeps: \{ extensions: \["\.tsx"\] \}/);
});

test("the vite config carries the canvas plugin that serves its worker module", async () => {
	const config = (await defaults()).get(".stack/vite.config.ts") ?? "";
	assert.match(
		config,
		/import \{ canvasPlugin \} from "@fcalell\/plugin-react-ui\/node\/canvas";/,
	);
	assert.match(config, /canvasPlugin\(\)/);
});

test("words mount a provider only when given", async () => {
	const bare = (await defaults()).get(".stack/virtual-providers.tsx");
	assert.doesNotMatch(bare ?? "", /WordsProvider/);
	const words = (
		await artifacts({ words: { ...ENGLISH, back: "Zurück" } })
	).get(".stack/virtual-providers.tsx");
	assert.match(words ?? "", /from "@fcalell\/plugin-react-ui\/lib\/words"/);
	assert.match(words ?? "", /back: "Zurück"/);
	assert.match(
		words ?? "",
		/earlierLines: \{ one: "Show \{count\} earlier line", other: "Show \{count\} earlier lines" \}/,
	);
});

test("the app's icon mounts the mark provider with its name, and an app with no icon mounts none", async () => {
	const bare = (await artifacts()).get(".stack/virtual-providers.tsx");
	assert.doesNotMatch(bare ?? "", /MarkProvider/);
	const single = (await artifacts({}, { icon: "/mark.svg" })).get(
		".stack/virtual-providers.tsx",
	);
	assert.match(single ?? "", /from "@fcalell\/plugin-react-ui\/lib\/mark"/);
	assert.match(single ?? "", /src: "\/mark\.svg"/);
	assert.match(single ?? "", /name: "shop"/);
	assert.doesNotMatch(single ?? "", /dark:/);
	const pair = (
		await artifacts({}, { icon: { light: "/a.svg", dark: "/b.svg" } })
	).get(".stack/virtual-providers.tsx");
	assert.match(pair ?? "", /src: "\/a\.svg"/);
	assert.match(pair ?? "", /dark: "\/b\.svg"/);
});

test("the entry hands the router to react-ui's navigation, and not without routes", async () => {
	const entry = (await defaults()).get(".stack/entry.tsx") ?? "";
	assert.match(
		entry,
		/import \{ bindRouter \} from "@fcalell\/plugin-react-ui\/lib\/navigate";/,
	);
	assert.match(
		entry,
		/const router = createRouter\(\{ routeTree \}\);\nbindRouter\(router\);/,
	);
	const off = (await artifacts({}, { routes: false })).get(".stack/entry.tsx");
	assert.doesNotMatch(off ?? "", /bindRouter/);
});

test("the entry sets react-ui's page for an unknown address on the router before render, and not without routes", async () => {
	const entry = (await defaults()).get(".stack/entry.tsx") ?? "";
	assert.match(
		entry,
		/import \{ bindNotFound \} from "@fcalell\/plugin-react-ui\/lib\/not-found";/,
	);
	const call = entry.indexOf("bindNotFound(router);");
	assert.ok(entry.indexOf("createRouter({ routeTree })") < call, entry);
	assert.ok(call < entry.indexOf("<RouterProvider"), entry);
	const off = (await artifacts({}, { routes: false })).get(".stack/entry.tsx");
	assert.doesNotMatch(off ?? "", /bindNotFound/);
});
