import { fileURLToPath } from "node:url";
import { writeStorybookConfig } from "@fcalell/plugin-screens/node";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { loadConfigFromFile, mergeConfig } from "vite";
import { defineConfig } from "vitest/config";
import { rosterPlugin } from "./.storybook/roster-plugin.ts";
import stackConfig from "./stack.config.ts";

const dirname = fileURLToPath(new URL(".", import.meta.url));

// Playwright's own browser is the default. Where none is installed (NixOS),
// `CHROME_PATH` names a Chrome to launch instead.
const chrome = process.env.CHROME_PATH;

// The app's own Vite config for a Storybook that draws components, from the
// slots it renders from.
const loaded = await loadConfigFromFile(
	{ command: "serve", mode: "test" },
	await writeStorybookConfig({ config: stackConfig, cwd: dirname }),
);
if (!loaded) throw new Error("the Storybook Vite config did not load");

export default defineConfig({
	...mergeConfig(loaded.config, { plugins: [rosterPlugin()] }),
	test: {
		// Memory: each parallel page is one renderer, so at most two open at once
		// across both projects. Set here, not per project: projects with different
		// `maxWorkers` cannot share one run.
		maxWorkers: 2,
		projects: [
			{
				extends: true,
				plugins: [
					storybookTest({
						configDir: `${dirname}.storybook`,
						tags: { exclude: ["touch"] },
					}),
				],
				test: {
					name: "storybook",
					testTimeout: 120_000,
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(
							chrome ? { launchOptions: { executablePath: chrome } } : {},
						),
						// The run is desktop density (the preview's initial global), so it is
						// drawn at a desktop width, not Vitest's 414 px default.
						instances: [
							{ browser: "chromium", viewport: { width: 1280, height: 800 } },
						],
					},
				},
			},
			// A second project: the touch stories, in a 375 px phone with touch events
			// on (`hasTouch` also sets `navigator.maxTouchPoints`, which d3-zoom reads
			// when the canvas mounts).
			{
				extends: true,
				plugins: [
					storybookTest({
						configDir: `${dirname}.storybook`,
						tags: { include: ["touch"] },
					}),
				],
				test: {
					name: "touch",
					testTimeout: 120_000,
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({
							contextOptions: { hasTouch: true },
							...(chrome ? { launchOptions: { executablePath: chrome } } : {}),
						}),
						instances: [
							{ browser: "chromium", viewport: { width: 375, height: 812 } },
						],
					},
				},
			},
		],
	},
});
