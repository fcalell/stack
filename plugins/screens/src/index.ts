import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { plugin, slot } from "@fcalell/cli";
import { emitArtifact } from "@fcalell/cli/cli-slots";
import { api } from "@fcalell/plugin-api";
import { react } from "@fcalell/plugin-react";
import { vite } from "@fcalell/plugin-vite";
import { renderScreensConfig, renderStorybookMain } from "./node/config.ts";
import type { PreviewGlobal } from "./types.ts";

const SOURCE = "screens";

// Modules a plugin contributes for the endpoints it owns outside the app's
// router (better-auth's session): each default-exports an array of MSW request
// handlers, answered beside the app's procedures in every screen's story, and
// is imported from the Storybook host's virtual module by its specifier.
const handlerModules = slot.list<string>({
	source: SOURCE,
	name: "handlerModules",
	sortBy: (a, b) => a.localeCompare(b),
});

// The toolbar globals a plugin owns: the design system's mode and density,
// pinned on the document root before a story paints. The host knows no design
// system; a global's `apply` says how its value reaches the root.
const previewGlobals = slot.list<PreviewGlobal>({
	source: SOURCE,
	name: "previewGlobals",
	sortBy: (a, b) => a.name.localeCompare(b.name),
});

// The Vite config the screens host runs on, rendered from the app's own slot
// values; null without a build output or routes to draw.
const viteConfig = slot.derived({
	source: SOURCE,
	name: "viteConfig",
	inputs: {
		configImports: vite.slots.configImports,
		pluginCalls: vite.slots.pluginCalls,
		resolveAliases: vite.slots.resolveAliases,
		resolveDedupe: vite.slots.resolveDedupe,
		devServerPort: vite.slots.devServerPort,
		outDir: vite.slots.outDir,
		serverProxy: vite.slots.serverProxy,
		fsAllow: vite.slots.fsAllow,
		watchIgnored: vite.slots.watchIgnored,
		clientHeaders: vite.slots.clientHeaders,
		routesDir: react.slots.routesDir,
		routerPlugin: react.slots.routerPlugin,
		entryImports: react.slots.entryImports,
		routerBindings: react.slots.routerBindings,
		prefixes: api.slots.routePrefixes,
		handlerModules,
		previewGlobals,
	},
	compute: (inp): string | null => {
		const { outDir, routesDir, routerPlugin } = inp;
		if (outDir === null || routesDir === null || routerPlugin === null)
			return null;
		return renderScreensConfig({ ...inp, outDir, routesDir, routerPlugin });
	},
});

// `.stack/screens/main.ts`, the Storybook config directory's one file.
const storybookMain = slot.derived({
	source: SOURCE,
	name: "storybookMain",
	inputs: { routesDir: react.slots.routesDir },
	compute: (inp): string | null =>
		inp.routesDir === null ? null : renderStorybookMain(inp.routesDir),
});

export const screens = plugin("screens", {
	label: "Screens",

	requires: ["react", "api"],

	guide: [
		{
			page: "screens",
			trigger:
				"Designing or changing a web screen, or checking its data, loading, error, empty and not-found states before calling it done: the fixtures in `src/app/fixtures.ts`, `stack screens dev`",
		},
	],

	// The workbench host's own packages, peers of this package (optional, so an
	// app that has auth or react-ui without `screens()` installs none of them):
	// `stack add screens` writes them into the app, where the host's
	// Storybook config, indexer and preview resolve them.
	// test/peers.test.ts holds them to the manifest's `peerDependencies`.
	devDependencies: {
		"@orpc/client": "1.14.4",
		"@orpc/server": "1.14.4",
		"@orpc/standard-server-fetch": "1.14.4",
		"@storybook/addon-a11y": "^10.6.1",
		"@storybook/react-vite": "^10.6.1",
		msw: "^2.15.0",
		"msw-storybook-addon": "^3.0.3",
		storybook: "^10.6.1",
	},

	slots: {
		handlerModules,
		previewGlobals,
		viteConfig,
		storybookMain,
	},

	contributes: (self) => [
		emitArtifact(".stack/screens.vite.config.ts", self.slots.viteConfig),
		emitArtifact(".stack/screens/main.ts", self.slots.storybookMain),
	],

	commands: {
		dev: {
			description: "Serve every route of the app in each of its query states",
			options: {
				port: {
					type: "number" as const,
					description: "Port Storybook listens on",
					default: 6006,
				},
			},
			handler: async (ctx, flags) => {
				// Storybook reads the generated config and the route tree, so they
				// are written first, as `stack dev` writes them.
				await ctx.generate();
				// From the app: Storybook is its package, the copy the host's config
				// resolves its framework and addons beside.
				const storybook = createRequire(join(ctx.cwd, "package.json")).resolve(
					"storybook/internal/bin/dispatcher",
				);
				const child = spawn(
					process.execPath,
					[
						storybook,
						"dev",
						"--config-dir",
						".stack/screens",
						"--port",
						String(flags.port),
						"--ci",
						"--no-open",
					],
					{ cwd: ctx.cwd, stdio: "inherit" },
				);
				await new Promise<void>((resolve, reject) => {
					child.on("error", reject);
					child.on("exit", (code) =>
						code === 0 || code === null
							? resolve()
							: reject(new Error(`storybook exited with ${code}`)),
					);
				});
			},
		},
	},
});

export type { PreviewGlobal } from "./types.ts";
