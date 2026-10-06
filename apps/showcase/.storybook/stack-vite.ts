import { fileURLToPath } from "node:url";
import {
	mergeConfig,
	type Plugin,
	type PluginOption,
	type UserConfig,
} from "vite";
import { rosterPlugin } from "./roster-plugin.ts";

const appDir = fileURLToPath(new URL("..", import.meta.url));
const workspaceDir = fileURLToPath(new URL("../../..", import.meta.url));

// A plugin option is a plugin or a nested array of them.
function withoutTanstack(options: PluginOption[]): PluginOption[] {
	return options
		.filter(
			(option) =>
				!(
					typeof option === "object" &&
					option !== null &&
					"name" in option &&
					/tanstack/i.test(option.name)
				),
		)
		.map((option) =>
			Array.isArray(option) ? withoutTanstack(option) : option,
		);
}

// Storybook runs Vite in middleware mode and never calls `server.listen()`,
// which is what starts the dependency optimizer: without this, `optimizeDeps`
// never scans or pre-bundles, and a CJS dep behind a node_modules import
// (`react-dom/client` through the dom shim) is served raw ("require is not
// defined"), while each dep found late reloads the page. Starting it here runs
// the scan Vite runs for any dev server.
function startOptimizer(): Plugin {
	return {
		name: "stack:start-optimizer",
		configureServer(server) {
			void server.environments.client.depsOptimizer?.init();
		},
	};
}

// Stack's generated Vite config (`.stack/vite.config.ts`), adapted for a tool
// that serves the app root itself. Every strip and override is here:
// - the TanStack router plugin goes: it needs `src/app/routes` and rewrites
//   `routeTree.gen.ts`, and no story routes;
// - the `server` block goes: its `X-Frame-Options: DENY` and CSP
//   `frame-ancestors 'none'` block Storybook's preview iframe, and port 3000
//   is the app's;
// - `root` moves from `.stack/` to the app, where Storybook's relative story
//   paths and cache URLs resolve, and `publicDir` and `outDir` follow;
// - `server.fs.allow` widens to the workspace root, where the plugin sources
//   and the workspace-linked packages live.
export function adaptStackConfig(config: UserConfig): UserConfig {
	const plugins = withoutTanstack(config.plugins ?? []);
	const { server: _server, ...rest } = config;
	return mergeConfig(
		{ ...rest, plugins },
		{
			plugins: [startOptimizer(), rosterPlugin()],
			server: { fs: { allow: [workspaceDir] } },
			root: appDir,
			publicDir: fileURLToPath(new URL("../public", import.meta.url)),
			build: {
				outDir: fileURLToPath(new URL("../storybook-static", import.meta.url)),
			},
		},
	);
}
