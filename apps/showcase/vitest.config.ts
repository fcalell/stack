import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import stackConfig from "./.stack/vite.config.ts";
import { adaptStackConfig } from "./.storybook/stack-vite.ts";

const dirname = fileURLToPath(new URL(".", import.meta.url));

// Playwright's own browser is the default. Where none is installed (NixOS),
// `CHROME_PATH` names a Chrome to launch instead.
const chrome = process.env.CHROME_PATH;

export default defineConfig({
	...adaptStackConfig(stackConfig),
	test: {
		projects: [
			{
				extends: true,
				plugins: [storybookTest({ configDir: `${dirname}.storybook` })],
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
		],
	},
});
