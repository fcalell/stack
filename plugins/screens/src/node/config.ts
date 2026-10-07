import { literalToProps, type TsExpression } from "@fcalell/cli/ast";
import { routerPluginFor } from "@fcalell/plugin-react/codegen";
import {
	renderViteConfig,
	type ViteConfigValues,
} from "@fcalell/plugin-vite/node";
import type { ScreensConfigValues } from "../types.ts";

// The app's fixtures module, beside the routes by convention.
export const FIXTURES = "src/app/fixtures.ts";

const ident = (name: string): TsExpression => ({ kind: "identifier", name });

// The directory the generated config sits in, `.stack/`.
const configDir: TsExpression = {
	kind: "call",
	callee: ident("fileURLToPath"),
	args: [
		{
			kind: "new",
			callee: ident("URL"),
			args: [
				{ kind: "string", value: "." },
				{ kind: "member", object: ident("import.meta"), property: "url" },
			],
		},
	],
};

// This package's own location: Vite 403s a path outside its workspace root, and
// a workspace-linked stack checkout serves the preview from beside the app's.
const ownRoot: TsExpression = {
	kind: "call",
	callee: ident("searchForWorkspaceRoot"),
	args: [
		{
			kind: "call",
			callee: ident("fileURLToPath"),
			args: [
				{
					kind: "call",
					callee: {
						kind: "member",
						object: ident("import.meta"),
						property: "resolve",
					},
					args: [{ kind: "string", value: "@fcalell/plugin-screens" }],
				},
			],
		},
	],
};

// What every Storybook host changes in the app's own config; nothing here
// reaches the app's `.stack/vite.config.ts`.
//   - `clientHeaders` goes: `frame-ancestors 'none'` blocks Storybook's
//     preview iframe.
//   - No dev-server proxy and no port: the app's backend is never reached, and
//     Storybook serves Vite itself.
function hosted(values: ViteConfigValues): ViteConfigValues {
	return { ...values, serverProxy: [], clientHeaders: {}, devServerPort: 0 };
}

// The Vite config the screens host runs on: the app's own, rendered from the
// same slot values, with what a host that serves the app's screens changes.
//   - `hosted`'s changes.
//   - The router plugin, which the app's own config runs, and the screens
//     plugin join: the route tree and fixtures, MSW's worker, and the
//     dependency optimizer. The router plugin runs with `autoCodeSplitting`
//     off: split modules (`?tsr-split=component`) are ids that fail
//     `existsSync`, so Vitest's `--changed` walk drops them and a component's
//     edit would reach no screen.
export function renderScreensConfig(values: ScreensConfigValues): string {
	const props = literalToProps({
		fixtures: `../${FIXTURES}`,
		routesDir: `../${values.routesDir}`,
		entryImports: values.entryImports.flatMap((spec) =>
			"sideEffect" in spec ? [spec.source] : [],
		),
		routerBindings: values.routerBindings.flatMap((spec) =>
			"named" in spec
				? spec.named.map((entry) => ({
						source: spec.source,
						name: typeof entry === "string" ? entry : entry.name,
					}))
				: [],
		),
		prefixes: values.prefixes,
		handlerModules: values.handlerModules,
		previewGlobals: values.previewGlobals,
	});
	const plugin: TsExpression = {
		kind: "call",
		callee: ident("screensPlugin"),
		args: [
			{
				kind: "object",
				properties: [
					{ key: "stackDir", value: configDir },
					...Object.entries(props).map(([key, value]) => ({ key, value })),
				],
			},
		],
	};
	const router = routerPluginFor({
		...values.routerOptions,
		autoCodeSplitting: false,
	});
	return renderViteConfig(
		hosted({
			...values,
			configImports: [
				...values.configImports,
				...router.imports,
				{ source: "node:url", named: ["fileURLToPath"] },
				{ source: "@fcalell/plugin-screens/vite", named: ["screensPlugin"] },
			],
			pluginCalls: [router.call, ...values.pluginCalls, plugin],
			fsAllow: [...values.fsAllow, ownRoot],
		}),
	);
}

// The Vite config of a Storybook that draws components, not routes (the
// showcase's roster): the app's own plugin calls, which hold no router plugin
// (it needs the route files and rewrites the route tree), with `hosted`'s
// changes and the dependency optimizer.
export function renderComponentHostConfig(values: ViteConfigValues): string {
	return renderViteConfig(
		hosted({
			...values,
			configImports: [
				...values.configImports,
				{ source: "@fcalell/plugin-screens/vite", named: ["storybookHost"] },
			],
			pluginCalls: [
				...values.pluginCalls,
				{ kind: "call", callee: ident("storybookHost"), args: [] },
			],
		}),
	);
}

// `.stack/screens/main.ts`: Storybook's config directory holds this one file.
// The one for the test run (`.stack/screens-test/main.ts`) adds the floors.
export function renderStorybookMain(options: { floors: boolean }): string {
	return [
		'import { screensMain } from "@fcalell/plugin-screens/storybook";',
		"",
		`export default screensMain({ floors: ${options.floors} });`,
		"",
	].join("\n");
}

// `.stack/screens.vitest.config.ts`: the screens host's own Vite config with
// the Storybook test plugin on the test run's config directory, one browser
// project. Each parallel page is one renderer, so two open at most.
export function renderVitestConfig(): string {
	return `import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import screens from "./screens.vite.config.ts";

// Playwright's own browser is the default; where none is installed (NixOS),
// \`CHROME_PATH\` names a Chrome to launch instead.
const chrome = process.env.CHROME_PATH;

export default defineConfig({
	...screens,
	test: {
		projects: [
			{
				extends: true,
				plugins: [
					storybookTest({
						configDir: fileURLToPath(new URL("./screens-test", import.meta.url)),
					}),
				],
				test: {
					name: "screens",
					testTimeout: 120_000,
					maxWorkers: 2,
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(
							chrome ? { launchOptions: { executablePath: chrome } } : {},
						),
						instances: [
							{ browser: "chromium", viewport: { width: 1280, height: 800 } },
						],
					},
				},
			},
		],
	},
});
`;
}
