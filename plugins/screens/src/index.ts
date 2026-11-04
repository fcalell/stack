import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { plugin, slot } from "@fcalell/cli";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { api } from "@fcalell/plugin-api";
import { react } from "@fcalell/plugin-react";
import { vite } from "@fcalell/plugin-vite";
import { startBrowser, stopBrowser } from "./node/browser.ts";
import { findChrome } from "./node/chrome.ts";
import {
	FIXTURES,
	renderScreensConfig,
	renderStorybookMain,
	renderVitestConfig,
} from "./node/config.ts";
import { drive } from "./node/drive.ts";
import { exitFailure } from "./node/exit.ts";
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
import { serve } from "./node/serve.ts";
import { shoot } from "./node/shoot.ts";
import {
	listScreens,
	STORIES_DIR,
	storyPath,
	syncStories,
} from "./node/stories.ts";
import type { PreviewGlobal, ServeStep, ServeTarget } from "./types.ts";
import { HEIGHT, SHOT_MAX_HEIGHT, WIDTHS } from "./widths.ts";

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

// What `stack screens serve` runs on: the steps that make the scratch state (the
// database migrated and seeded), the env a plugin adds to the server's, and the
// deploy target's server. A target may be one only: the first contribution
// starts.
const serveSteps = slot.list<ServeStep>({
	source: SOURCE,
	name: "serveSteps",
	sortBy: (a, b) => a.name.localeCompare(b.name),
	uniqueBy: (step) => step.name,
});

const serveEnv = slot.list<(serve: { url: string }) => Record<string, string>>({
	source: SOURCE,
	name: "serveEnv",
});

const serveTargets = slot.list<ServeTarget>({
	source: SOURCE,
	name: "serveTargets",
	uniqueBy: (target) => target.name,
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

// Runs a Node script in the app and resolves when it exits cleanly. A signal
// the CLI receives goes on to the script, which closes its browser contexts.
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
	const forward = (signal: NodeJS.Signals) => child.kill(signal);
	process.on("SIGINT", forward);
	process.on("SIGTERM", forward);
	try {
		await new Promise<void>((resolve, reject) => {
			child.on("error", reject);
			child.on("close", (code, signal) => {
				const failure = exitFailure(label, code, signal);
				if (failure === null) resolve();
				else reject(new Error(failure));
			});
		});
	} finally {
		process.off("SIGINT", forward);
		process.off("SIGTERM", forward);
	}
}

export const screens = plugin("screens", {
	label: "Screens",

	requires: ["react", "api"],

	guide: [
		{
			page: "screens",
			trigger:
				"Designing or changing a web screen, or checking its data, loading, error, empty and not-found states before calling it done: the fixtures in `src/app/fixtures.ts`, `stack screens dev`, `stack screens test`, or a seeded server for `shoot` and `drive` (`stack screens serve`)",
		},
	],

	// The workbench host's own packages, peers of this package (optional, so an
	// app that has auth or react-ui without `screens()` installs none of them):
	// `stack add screens` writes them into the app, where the host's
	// Storybook config, test config and preview resolve them. The oRPC packages
	// the host answers with are this package's own dependencies, not the app's:
	// a second copy of `@orpc/client` in the app (plugin-react's tanstack-query
	// pulls one) is a second `ORPCError` class.
	devDependencies: {
		"@storybook/addon-a11y": "^10.6.1",
		"@storybook/addon-vitest": "^10.6.1",
		"@storybook/react-vite": "^10.6.1",
		"@vitest/browser": "^5.0.3",
		msw: "^2.15.0",
		"msw-storybook-addon": "^3.0.3",
		storybook: "^10.6.1",
		vitest: "^5.0.3",
	},

	// The story files are generated, one per route.
	gitignore: [STORIES_DIR],

	slots: {
		handlerModules,
		fixtureModules,
		serveSteps,
		serveEnv,
		serveTargets,
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
		browser: {
			description:
				"Start the shared Chrome and leave it running; `browser stop` ends it",
			handler: async () => {
				const word = process.argv[4];
				if (word === "stop") {
					console.log(
						(await stopBrowser())
							? "stack screens browser: stopped"
							: "stack screens browser: none running",
					);
					return;
				}
				if (word !== undefined)
					throw new Error(`stack screens browser: ${word} is not stop`);
				findChrome();
				const { port, pid } = await startBrowser();
				console.log(`stack screens browser: Chrome ${pid} on port ${port}`);
			},
		},
		shoot: {
			description:
				"Open routes of a live app at each width and mode, shoot them, and judge each: overflow, the render walk, axe",
			options: {
				url: { type: "string" as const, description: "The app's address" },
				route: {
					type: "string" as const,
					description: "A comma list of routes to open (like /,/deploys)",
				},
				width: {
					type: "string" as const,
					description: "A comma list of widths in px (default: 320,1920)",
				},
				mode: {
					type: "string" as const,
					description: "A comma list of light and dark (default: dark)",
				},
				shots: {
					type: "string" as const,
					description: "The directory for the PNGs (default: .stack/shots)",
				},
				full: {
					type: "boolean" as const,
					description: `Grow the page to all it holds, up to ${SHOT_MAX_HEIGHT}px`,
					default: false,
				},
				open: {
					type: "string" as const,
					description:
						"After each route, press the control with this text, then judge and shoot it open",
				},
				settle: {
					type: "number" as const,
					description:
						"The most a page may take to go quiet, in ms (default: 10000)",
				},
				cookie: {
					type: "string" as const,
					description: "A cookie to set, name=value, for a guarded route",
				},
				"sign-in": {
					type: "string" as const,
					description: "A URL opened first, which sets the session",
				},
			},
			handler: (ctx, flags) => shoot(flags, ctx.cwd),
		},
		drive: {
			description:
				"Run a plan (stack screens drive <plan.json> --url <app>) of steps in a live app, judging at each shot",
			options: {
				url: { type: "string" as const, description: "The app's address" },
				shots: {
					type: "string" as const,
					description: "The directory for the PNGs (default: .stack/shots)",
				},
				full: {
					type: "boolean" as const,
					description: `Grow the page to all it holds, up to ${SHOT_MAX_HEIGHT}px`,
					default: false,
				},
				settle: {
					type: "number" as const,
					description:
						"The most a page may take to go quiet, in ms (default: 10000)",
				},
				cookie: {
					type: "string" as const,
					description: "A cookie to set, name=value, for a guarded route",
				},
				"sign-in": {
					type: "string" as const,
					description: "A URL opened first, which sets the session",
				},
			},
			handler: (ctx, flags) => {
				const plan = process.argv[4];
				if (!plan || plan.startsWith("-"))
					throw new Error(
						"stack screens drive: name the plan right after drive: drive <plan.json> --url <app>",
					);
				return drive(plan, flags, ctx.cwd);
			},
		},
		serve: {
			description:
				"Run the app's real server on throwaway state with seeded data, for shoot --url and drive --url",
			options: {
				port: {
					type: "number" as const,
					description: "The port to serve on (default: a free one)",
				},
				entry: {
					type: "string" as const,
					description:
						"A Node file that starts the server itself, listening on STACK_SERVE_PORT, its state in STACK_SERVE_DIR",
				},
				keep: {
					type: "boolean" as const,
					description: "Leave the scratch directory when the run ends",
					default: false,
				},
			},
			handler: async (ctx, flags) => {
				await ctx.generate();
				const outDir = await ctx.resolve(vite.slots.outDir);
				await serve({
					cwd: ctx.cwd,
					flags,
					steps: await ctx.resolve(serveSteps),
					envs: await ctx.resolve(serveEnv),
					targets: await ctx.resolve(serveTargets),
					rpc: await ctx.resolve(api.slots.rpcPrefix),
					vite:
						outDir === null ? null : { bin: binOf(ctx.cwd, "vite"), outDir },
				});
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
					description: `Save a PNG of each screen at each width the run visits into this directory (the viewport, ${HEIGHT}px tall)`,
				},
				full: {
					type: "boolean" as const,
					description: `With --shots, grow the page to all it holds, up to ${SHOT_MAX_HEIGHT}px`,
					default: false,
				},
				open: {
					type: "string" as const,
					description:
						"After a screen draws, press the control with this text or accessible name, then judge and shoot it open",
				},
				search: {
					type: "string" as const,
					description:
						"Draw every screen at this search (like ?q=x) instead of the fixtures' example",
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
					full: flags.full === true,
					open: typeof flags.open === "string" ? flags.open : null,
					search: typeof flags.search === "string" ? flags.search : null,
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
						...(selection.open ? [`open "${selection.open}";`] : []),
						...(selection.search !== null
							? [`search ${selection.search};`]
							: []),
						`screens ${requested ? files.join(", ") : flags.all ? "all" : `changed${typeof flags.changed === "string" ? ` since ${flags.changed}` : ""}`}`,
					].join(" "),
				);
				findChrome();
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
