import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { plugin, slot } from "@fcalell/cli";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { api } from "@fcalell/plugin-api";
import { react } from "@fcalell/plugin-react";
import { vite } from "@fcalell/plugin-vite";
import {
	FIXTURES,
	renderScreensConfig,
	renderStorybookMain,
	renderVitestConfig,
} from "./node/config.ts";
import { SCREEN_STATES } from "./node/screens.ts";
import {
	globalExcludes,
	parseShots,
	parseWidths,
	type RunSelection,
	selectionEnv,
	selectScreens,
	shotsSince,
	stateExcludes,
} from "./node/select.ts";
import {
	listScreens,
	STORIES_DIR,
	storyPath,
	syncStories,
} from "./node/stories.ts";
import type { PreviewGlobal } from "./types.ts";
import { WIDTHS } from "./widths.ts";

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

// Modules a plugin contributes for the oRPC procedures it owns (plugin-auth's
// `auth.session`): each default-exports a fixtures tree, answered after the
// app's own in every screen's story, so the app overrides a plugin's answer
// per procedure. Imported from the Storybook host's virtual module by its
// specifier.
const fixtureModules = slot.list<string>({
	source: SOURCE,
	name: "fixtureModules",
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
		optimizeExclude: vite.slots.optimizeExclude,
		devServerPort: vite.slots.devServerPort,
		outDir: vite.slots.outDir,
		serverProxy: vite.slots.serverProxy,
		fsAllow: vite.slots.fsAllow,
		watchIgnored: vite.slots.watchIgnored,
		clientHeaders: vite.slots.clientHeaders,
		routesDir: react.slots.routesDir,
		routerOptions: react.slots.routerOptions,
		entryImports: react.slots.entryImports,
		routerBindings: react.slots.routerBindings,
		prefixes: api.slots.routePrefixes,
		handlerModules,
		fixtureModules,
		previewGlobals,
	},
	compute: (inp): string | null => {
		const { outDir, routesDir, routerOptions } = inp;
		if (outDir === null || routesDir === null || routerOptions === null)
			return null;
		return renderScreensConfig({ ...inp, outDir, routesDir, routerOptions });
	},
});

// `.stack/screens/main.ts`, the Storybook config directory's one file.
const storybookMain = slot.derived({
	source: SOURCE,
	name: "storybookMain",
	inputs: { routesDir: react.slots.routesDir },
	compute: (inp): string | null =>
		inp.routesDir === null ? null : renderStorybookMain({ floors: false }),
});

// `.stack/screens-test/main.ts`: the same Storybook config with the floors,
// which only the test run loads.
const testMain = slot.derived({
	source: SOURCE,
	name: "testMain",
	inputs: { routesDir: react.slots.routesDir },
	compute: (inp): string | null =>
		inp.routesDir === null ? null : renderStorybookMain({ floors: true }),
});

// `.stack/screens.vitest.config.ts`: the test run's config, which extends
// `viteConfig`'s file, so the host is the one the workbench serves.
const vitestConfig = slot.derived({
	source: SOURCE,
	name: "vitestConfig",
	inputs: { viteConfig },
	compute: (inp): string | null =>
		inp.viteConfig === null ? null : renderVitestConfig(),
});

// A package's bin, from the app's own copy of the package: the one its
// generated config and Storybook config resolve their plugins beside.
function binOf(cwd: string, name: string): string {
	const manifest = createRequire(join(cwd, "package.json")).resolve(
		`${name}/package.json`,
	);
	const bin = (
		JSON.parse(readFileSync(manifest, "utf8")) as {
			bin: Record<string, string>;
		}
	).bin[name];
	return join(dirname(manifest), bin as string);
}

// Runs a Node script in the app and resolves when it exits cleanly.
async function run(
	cwd: string,
	label: string,
	script: string,
	args: string[],
	env: Record<string, string> = {},
): Promise<void> {
	const child = spawn(process.execPath, [script, ...args], {
		cwd,
		stdio: "inherit",
		env: { ...process.env, ...env },
	});
	await new Promise<void>((resolve, reject) => {
		child.on("error", reject);
		child.on("exit", (code) =>
			code === 0 || code === null
				? resolve()
				: reject(new Error(`${label} exited with ${code}`)),
		);
	});
}

export const screens = plugin("screens", {
	label: "Screens",

	requires: ["react", "api"],

	guide: [
		{
			page: "screens",
			trigger:
				"Designing or changing a web screen, or checking its data, loading, error, empty and not-found states before calling it done: the fixtures in `src/app/fixtures.ts`, `stack screens dev`, `stack screens test`",
		},
	],

	// The workbench host's own packages, peers of this package (optional, so an
	// app that has auth or react-ui without `screens()` installs none of them):
	// `stack add screens` writes them into the app, where the host's
	// Storybook config, test config and preview resolve them.
	devDependencies: {
		"@orpc/client": "1.14.4",
		"@orpc/server": "1.14.4",
		"@orpc/standard-server-fetch": "1.14.4",
		"@storybook/addon-a11y": "^10.6.1",
		"@storybook/addon-vitest": "^10.6.1",
		"@storybook/react-vite": "^10.6.1",
		"@vitest/browser-playwright": "^5.0.3",
		msw: "^2.15.0",
		"msw-storybook-addon": "^3.0.3",
		playwright: "^1.63.0",
		storybook: "^10.6.1",
		vitest: "^5.0.3",
	},

	// The story files are generated, one per route.
	gitignore: [STORIES_DIR],

	slots: {
		handlerModules,
		fixtureModules,
		previewGlobals,
		viteConfig,
		storybookMain,
		testMain,
		vitestConfig,
	},

	contributes: (self) => [
		emitArtifact(".stack/screens.vite.config.ts", self.slots.viteConfig),
		emitArtifact(".stack/screens/main.ts", self.slots.storybookMain),
		emitArtifact(".stack/screens-test/main.ts", self.slots.testMain),
		emitArtifact(".stack/screens.vitest.config.ts", self.slots.vitestConfig),

		// One story file per route, in step with the routes after every generate.
		cliSlots.postWrite.contribute(async (ctx) => {
			const dir = await ctx.resolve(react.slots.routesDir);
			if (dir === null) return undefined;
			const previewGlobals = await ctx.resolve(self.slots.previewGlobals);
			return () =>
				syncStories({
					root: ctx.cwd,
					routes: join(ctx.cwd, dir),
					fixtures: join(ctx.cwd, FIXTURES),
					previewGlobals,
				});
		}),
		cliSlots.removeFiles.contribute(() => `${STORIES_DIR}/`),
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
				// Storybook reads the generated config, the route tree and the story
				// files, so they are written first, as `stack dev` writes them.
				await ctx.generate();
				await run(
					ctx.cwd,
					"storybook",
					createRequire(join(ctx.cwd, "package.json")).resolve(
						"storybook/internal/bin/dispatcher",
					),
					[
						"dev",
						"--config-dir",
						".stack/screens",
						"--port",
						String(flags.port),
						"--ci",
						"--no-open",
					],
				);
			},
		},
		test: {
			description:
				"Check every screen in a headless browser: axe, no horizontal overflow, the render walk, no console output",
			options: {
				all: {
					type: "boolean" as const,
					description:
						"Run every screen, not only those a changed file reaches",
					default: false,
				},
				changed: {
					type: "string" as const,
					description:
						"Run the screens a file changed since this git ref reaches (default: uncommitted changes)",
				},
				screen: {
					type: "string" as const,
					description:
						"Run these screens (a comma list of route ids or screen titles) instead of those a changed file reaches",
				},
				width: {
					type: "string" as const,
					description: `Check at these widths only (a comma list of ${WIDTHS.join(", ")}; default: all)`,
				},
				mode: {
					type: "string" as const,
					description:
						"Check in these modes only (a comma list of the app's modes, light and dark; default: all)",
				},
				state: {
					type: "string" as const,
					description: `Check these states only (a comma list of ${SCREEN_STATES.map(({ state }) => state).join(", ")}; default: all)`,
				},
				shots: {
					type: "string" as const,
					description:
						"Save a PNG of each screen at each width the run visits into this directory",
				},
			},
			handler: async (ctx, flags) => {
				const routesDir = await ctx.resolve(react.slots.routesDir);
				const globals = await ctx.resolve(previewGlobals);
				// Bad flags fail before anything is generated or started.
				const selection: RunSelection = {
					widths: parseWidths(flags.width),
					exclude: [
						...globalExcludes(globals, "mode", flags.mode),
						...stateExcludes(flags.state),
					],
					shots: parseShots(flags.shots, ctx.cwd),
				};
				const requested = typeof flags.screen === "string";
				const files =
					requested && routesDir !== null
						? selectScreens(
								await listScreens(join(ctx.cwd, routesDir)),
								flags.screen,
							).map((id) => `${STORIES_DIR}/${storyPath(id)}`)
						: [];
				const modes = globals.find((g) => g.name === "mode");
				const checked = modes?.checked ?? [];
				console.log(
					[
						"stack screens test:",
						`widths ${selection.widths.join(", ")};`,
						`modes ${checked.filter((m) => !selection.exclude.includes(`mode:${m}`)).join(", ") || "default"};`,
						`states ${SCREEN_STATES.filter(
							({ state }) => !selection.exclude.includes(`state:${state}`),
						)
							.map(({ state }) => state)
							.join(", ")};`,
						...(selection.shots ? [`shots in ${selection.shots};`] : []),
						`screens ${requested ? files.join(", ") : flags.all ? "all" : `changed${typeof flags.changed === "string" ? ` since ${flags.changed}` : ""}`}`,
					].join(" "),
				);
				await ctx.generate();
				const started = Date.now();
				try {
					await run(
						ctx.cwd,
						"vitest",
						binOf(ctx.cwd, "vitest"),
						[
							"run",
							"--config",
							".stack/screens.vitest.config.ts",
							// A clean tree has nothing to run, which is no failure.
							"--passWithNoTests",
							...files,
							// `--screen` names the files; the changed selection stays only
							// when asked for beside it.
							...(flags.all || (requested && typeof flags.changed !== "string")
								? []
								: [
										"--changed",
										...(typeof flags.changed === "string"
											? [flags.changed]
											: []),
									]),
						],
						selectionEnv(selection),
					);
				} finally {
					// Listed whether or not the run passed: the shots are taken either way.
					if (selection.shots) {
						const taken = shotsSince(selection.shots, started);
						console.log(
							[`stack screens test: ${taken.length} shots`, ...taken].join(
								"\n",
							),
						);
					}
				}
			},
		},
	},
});

export type { PreviewGlobal } from "./types.ts";
