import type { ProviderSpec, TsImportSpec } from "@fcalell/cli/ast";
import { z } from "zod";

// ── Plugin options ─────────────────────────────────────────────────

// A consumer-declared Expo config plugin: one entry for the generated
// app.config `plugins` array plus the npm package(s) it needs installed.
// `name` is the config-plugin id (usually the package name), `options` are
// passed through verbatim, and `dependencies` are merged into the consumer's
// package.json so the native module is installed alongside its config plugin.
const configPluginSchema = z.object({
	name: z.string().min(1),
	options: z.record(z.string(), z.unknown()).optional(),
	dependencies: z.record(z.string(), z.string()).optional(),
});

export type ConfigPluginSpec = z.infer<typeof configPluginSchema>;

export const expoOptionsSchema = z.object({
	// Metro dev-server port. Defaults to Expo's 8081; flows into the localhost
	// CORS origin contributed to plugin-api.
	port: z.number().int().min(1).max(65535).optional(),
	// File-based routing. `false` disables expo-router wiring entirely (rare —
	// a bare-RN consumer). Otherwise `appDir` overrides the routes directory
	// (default `src/app`), mirroring `solid({ routes: { pagesDir } })`.
	routes: z
		.union([
			z.literal(false),
			z.object({
				appDir: z.string().min(1, "appDir cannot be empty").optional(),
			}),
		])
		.optional(),
	// Deep-link / OAuth-redirect URL scheme. Defaults to the app slug.
	scheme: z.string().min(1).optional(),
	// EAS build profile names (`eas build --profile <name>`). Must line up with
	// the profiles declared in the consumer's `eas.json`.
	easProfiles: z.array(z.string().min(1)).min(1).optional(),
	// Default EAS Update channel (`eas update --channel <name>`).
	updateChannel: z.string().min(1).optional(),
	// Extra Expo config plugins merged into the generated app.config `plugins`
	// array — the supported path for native modules (e.g.
	// `expo-apple-authentication`, `@react-native-google-signin/google-signin`,
	// camera, notifications). Each entry's `dependencies` are installed into the
	// consumer's package.json.
	configPlugins: z.array(configPluginSchema).optional(),
});

export type ExpoOptions = z.input<typeof expoOptionsSchema>;

// ── Metro config codegen ───────────────────────────────────────────
//
// `.stack/metro.config.cjs` is CommonJS (Metro loads it via `require`), so it
// is built as a string rather than through the ESM-only `renderTsSourceFile`
// printer. These specs are the structured inputs the aggregator composes.

// A destructured CJS require at the top of metro.config.cjs:
//   const { getDefaultConfig } = require("expo/metro-config");
export interface MetroRequireSpec {
	names: string[];
	module: string;
}

// A Metro config higher-order wrapper applied around the base config:
//   config = withUniwindConfig(config, { cssEntryFile: "./global.css" });
// `options` must be JSON-serializable (all real Metro wrappers take plain
// config objects), so it renders unambiguously into the emitted file.
export interface MetroWrapperSpec {
	callee: string;
	options?: Record<string, unknown>;
	order?: number;
}

export interface CodegenMetroPayload {
	requires: MetroRequireSpec[];
	wrappers: MetroWrapperSpec[];
}

// ── Expo app config codegen ────────────────────────────────────────
//
// `.stack/app.config.cjs` holds an object with arbitrary nested plugin options
// — not expressible via the ESM AST printer — so it is assembled as a string.
// It is emitted as `.cjs` (not `.ts`/`.js`) because Expo's loader `require()`s
// it through Node; see `aggregateExpoConfig` for the full rationale.
//
// A config-plugin entry renders to `"name"` or `["name", { …options }]` in the
// app.config `plugins` array. Modelled as an object (not a `[name, options]`
// tuple) so a single contribution to the `expoConfigPlugins` list slot is one
// item — a tuple would be spread into two items by the list compositor.
export interface ExpoConfigPlugin {
	name: string;
	options?: Record<string, unknown>;
}

export interface CodegenExpoConfigPayload {
	name: string;
	slug: string;
	scheme: string;
	bundleIdentifier: string;
	androidPackage: string;
	plugins: ExpoConfigPlugin[];
	// Enables expo-router typed-route generation when routing is on.
	typedRoutes: boolean;
}

// ── Entry codegen ──────────────────────────────────────────────────
//
// `.stack/entry.tsx` is regular TSX and is built through `renderTsSourceFile`.
// Providers compose around `<ExpoRoot context={require.context(<appDir>)} />`,
// the documented custom-root hook for injecting global providers above
// expo-router.
export interface CodegenEntryPayload {
	imports: TsImportSpec[];
	providers: ProviderSpec[];
	// Path passed to `require.context`, relative to `.stack/` (e.g.
	// `../src/app`). `null` when routing is disabled — no ExpoRoot is rendered.
	appContextPath: string | null;
}
