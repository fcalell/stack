import { spawnSync } from "node:child_process";
import { plugin, slot } from "@fcalell/cli";
import type { ProviderSpec, TsImportSpec } from "@fcalell/cli/ast";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { api } from "@fcalell/plugin-api";
import {
	aggregateEntry,
	aggregateExpoConfig,
	aggregateMetroConfig,
	buildRoutesDts,
} from "./node/codegen";
import {
	type ExpoConfigPlugin,
	type ExpoOptions,
	expoOptionsSchema,
	type MetroRequireSpec,
	type MetroWrapperSpec,
} from "./types";

const SOURCE = "expo";

const DEFAULT_PORT = 8081;
const DEFAULT_APP_DIR = "src/app";
const DEFAULT_EAS_PROFILES = ["development", "preview", "production"];
const DEFAULT_UPDATE_CHANNEL = "production";

// The generated expo-router custom root. It calls `registerRootComponent` and
// mounts the provider stack, so it must be the package's `main` to ever run.
const ENTRY_ARTIFACT = ".stack/entry.tsx";

// Mirrors the `expo-env.d.ts` Expo's own tooling writes at a project root: a
// single reference that pulls Expo's ambient types into the app's TS program
// (require.context for the router entry, EXPO_PUBLIC_* env vars, etc.).
// Emitted into `.stack/` so the consumer's `tsconfig.app.json` includes it
// without a hand-managed file.
const EXPO_ENV_ARTIFACT = ".stack/expo-env.d.ts";
const EXPO_ENV_DTS = '/// <reference types="expo/types" />\n';

// ── Identifier helpers ─────────────────────────────────────────────

function slugify(name: string): string {
	return (
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "app"
	);
}

// Make a string a legal Java/Android package segment: alphanumerics only, and —
// since a segment must start with a letter — prefix a leading digit with `a`
// (e.g. "1foo" → "a1foo"). Empty input falls back to "app".
function packageSegment(raw: string): string {
	const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
	if (cleaned.length === 0) return "app";
	return /^[0-9]/.test(cleaned) ? `a${cleaned}` : cleaned;
}

// A leaf segment safe for both an iOS bundle identifier and an Android package
// (the latter forbids hyphens), derived from the app slug.
function packageLeaf(slug: string): string {
	return packageSegment(slug);
}

// Reverse a domain into a bundle-id prefix: "wenauti.app" → "app.wenauti".
function reverseDomain(domain: string): string {
	const segments = domain
		.split(".")
		.map((s) => s.replace(/[^a-zA-Z0-9]/g, ""))
		.filter((s) => s.length > 0)
		.map(packageSegment);
	return segments.length > 0 ? segments.reverse().join(".") : "app";
}

// Compose the bundle identifier from the reversed domain + app leaf, collapsing
// a doubled leaf when the domain's last label already equals the slug (e.g.
// domain "wenauti.app" + slug "wenauti" → "app.wenauti", not the redundant
// "app.wenauti.wenauti"). Generic domains ("example.com" → "com.example.myapp")
// keep the leaf.
function buildBundleId(domain: string, slug: string): string {
	const prefix = reverseDomain(domain);
	const leaf = packageLeaf(slug);
	const labels = prefix.split(".");
	if (labels[labels.length - 1] === leaf) return prefix;
	return `${prefix}.${leaf}`;
}

// ── Slot declarations ──────────────────────────────────────────────
//
// plugin-expo owns the native bootstrap the way plugin-vite + plugin-solid
// own the web one: metro config, the Expo app config, the entry, and typed
// routes. Peer plugins (native-ui, auth/expo, api/tanstack-query) contribute
// into the list slots; the derived `*Config`/`*Source` slots compose them
// into the files emitted under `.stack/`. Ordering is pure dataflow.

const metroConfigImports = slot.list<MetroRequireSpec>({
	source: SOURCE,
	name: "metroConfigImports",
	sortBy: (a, b) => a.module.localeCompare(b.module),
});

const metroPluginCalls = slot.list<MetroWrapperSpec>({
	source: SOURCE,
	name: "metroPluginCalls",
	// `callee` names the wrapper applied around the config; two wrappers with
	// the same name would emit duplicate `config = x(config, …)` lines.
	uniqueBy: (w) => w.callee,
});

// Entries for the app.config `plugins` array (config plugins like
// `"expo-router"` or `["expo-build-properties", { … }]`). Sorted by name so
// the emitted array is independent of plugin iteration order.
const expoConfigPlugins = slot.list<ExpoConfigPlugin>({
	source: SOURCE,
	name: "expoConfigPlugins",
	sortBy: (a, b) => a.name.localeCompare(b.name),
	uniqueBy: (p) => p.name,
});

// Providers wrapped around the expo-router root in entry.tsx — native-ui /
// auth-expo / api-tanstack-query contribute here. Sorted ascending by `order`
// so lower-order providers become outer wrappers (mirrors solid).
const providers = slot.list<ProviderSpec>({
	source: SOURCE,
	name: "providers",
	sortBy: (a, b) => a.order - b.order,
});

const entryImports = slot.list<TsImportSpec>({
	source: SOURCE,
	name: "entryImports",
	sortBy: (a, b) => a.source.localeCompare(b.source),
});

// Resolved Metro dev-server port. Defaults to Expo's 8081; flows into the
// localhost CORS origin contributed to plugin-api.
const devServerPort = slot.value<number>({
	source: SOURCE,
	name: "devServerPort",
	seed: (ctx) => {
		const opts = (ctx.options ?? {}) as ExpoOptions;
		return opts.port ?? DEFAULT_PORT;
	},
});

// Resolved routes directory. `null` disables expo-router wiring entirely
// (consumer passed `routes: false`). Drives entry.tsx's `require.context`
// path, typed-routes generation, and routes.d.ts emission.
const routesPagesDir = slot.derived<string | null, Record<string, never>>({
	source: SOURCE,
	name: "routesPagesDir",
	inputs: {},
	compute: (_inputs, ctx) => {
		const opts = (ctx.options ?? {}) as ExpoOptions;
		if (opts.routes === false) return null;
		if (opts.routes && typeof opts.routes === "object") {
			return opts.routes.appDir ?? DEFAULT_APP_DIR;
		}
		return DEFAULT_APP_DIR;
	},
});

// EAS build profile names (`eas build --profile <name>`). Consumed by the
// `expo build` command to validate the requested profile and pick a default.
const easBuildProfiles = slot.value<string[]>({
	source: SOURCE,
	name: "easBuildProfiles",
	seed: (ctx) => {
		const opts = (ctx.options ?? {}) as ExpoOptions;
		return opts.easProfiles ?? DEFAULT_EAS_PROFILES;
	},
});

// Default EAS Update channel (`eas update --channel <name>`).
const easUpdateChannel = slot.value<string>({
	source: SOURCE,
	name: "easUpdateChannel",
	seed: (ctx) => {
		const opts = (ctx.options ?? {}) as ExpoOptions;
		return opts.updateChannel ?? DEFAULT_UPDATE_CHANNEL;
	},
});

// ── Derived sources ────────────────────────────────────────────────

const metroConfig = slot.derived<
	string | null,
	{ requires: typeof metroConfigImports; wrappers: typeof metroPluginCalls }
>({
	source: SOURCE,
	name: "metroConfig",
	inputs: { requires: metroConfigImports, wrappers: metroPluginCalls },
	compute: (inp) =>
		aggregateMetroConfig({ requires: inp.requires, wrappers: inp.wrappers }),
});

const expoConfig = slot.derived<
	string | null,
	{ plugins: typeof expoConfigPlugins; pagesDir: typeof routesPagesDir }
>({
	source: SOURCE,
	name: "expoConfig",
	inputs: { plugins: expoConfigPlugins, pagesDir: routesPagesDir },
	compute: (inp, ctx) => {
		const slug = slugify(ctx.app.name);
		const opts = (ctx.options ?? {}) as ExpoOptions;
		const routesEnabled = inp.pagesDir !== null;
		const bundleId = buildBundleId(ctx.app.domain, slug);
		// expo-router is listed as a config plugin so its native deep-link setup
		// runs during prebuild; only when routing is enabled.
		const basePlugins: ExpoConfigPlugin[] = routesEnabled
			? [{ name: "expo-router" }, ...inp.plugins]
			: inp.plugins;
		return aggregateExpoConfig({
			name: ctx.app.name,
			slug,
			scheme: opts.scheme ?? slug,
			bundleIdentifier: bundleId,
			androidPackage: bundleId,
			plugins: basePlugins,
			typedRoutes: routesEnabled,
		});
	},
});

const entrySource = slot.derived<
	string | null,
	{
		imports: typeof entryImports;
		providers: typeof providers;
		pagesDir: typeof routesPagesDir;
	}
>({
	source: SOURCE,
	name: "entrySource",
	inputs: { imports: entryImports, providers, pagesDir: routesPagesDir },
	compute: (inp) =>
		aggregateEntry({
			imports: inp.imports,
			providers: inp.providers,
			// entry.tsx lives in `.stack/`, so the app dir is one level up.
			appContextPath: inp.pagesDir === null ? null : `../${inp.pagesDir}`,
		}),
});

const routesDtsSource = slot.derived<
	string | null,
	{ pagesDir: typeof routesPagesDir }
>({
	source: SOURCE,
	name: "routesDtsSource",
	inputs: { pagesDir: routesPagesDir },
	compute: (inp) => (inp.pagesDir === null ? null : buildRoutesDts()),
});

// ── Command helpers ────────────────────────────────────────────────

interface RunResult {
	ok: boolean;
}

function runInherit(command: string, args: string[], cwd: string): RunResult {
	const result = spawnSync(command, args, { cwd, stdio: "inherit" });
	return { ok: !result.error && result.status === 0 };
}

export const expo = plugin<
	"expo",
	ExpoOptions,
	{
		metroConfigImports: typeof metroConfigImports;
		metroPluginCalls: typeof metroPluginCalls;
		expoConfigPlugins: typeof expoConfigPlugins;
		providers: typeof providers;
		entryImports: typeof entryImports;
		devServerPort: typeof devServerPort;
		routesPagesDir: typeof routesPagesDir;
		easBuildProfiles: typeof easBuildProfiles;
		easUpdateChannel: typeof easUpdateChannel;
		metroConfig: typeof metroConfig;
		expoConfig: typeof expoConfig;
		entrySource: typeof entrySource;
		routesDtsSource: typeof routesDtsSource;
	}
>("expo", {
	label: "Expo",

	schema: expoOptionsSchema,

	dependencies: {
		"@fcalell/plugin-expo": "workspace:*",
		expo: "~56.0.8",
		"expo-router": "~56.2.8",
		react: "19.2.7",
		"react-native": "0.85.3",
	},
	devDependencies: {
		"eas-cli": "^20.0.0",
		// React's types back the app's JSX (`react/jsx-runtime`); without it a
		// consumer's `tsconfig.app.json` can't resolve the automatic runtime.
		"@types/react": "~19.2.0",
	},
	// Expo cache + prebuild outputs (continuous native generation regenerates
	// ios/ + android/ on demand via `stack expo prebuild`).
	gitignore: [".expo", "ios", "android"],

	slots: {
		metroConfigImports,
		metroPluginCalls,
		expoConfigPlugins,
		providers,
		entryImports,
		devServerPort,
		routesPagesDir,
		easBuildProfiles,
		easUpdateChannel,
		metroConfig,
		expoConfig,
		entrySource,
		routesDtsSource,
	},

	commands: {
		dev: {
			description: "Start the Metro dev server (expo start)",
			options: {
				clear: {
					type: "boolean",
					description: "Clear the Metro bundler cache before starting",
					default: false,
				},
			},
			handler: async (ctx, flags) => {
				const port = await ctx.resolve(devServerPort);
				const args = ["expo", "start", "--port", String(port)];
				if (flags.clear) args.push("--clear");
				const { ok } = runInherit("npx", args, ctx.cwd);
				if (!ok) throw new Error("expo start failed");
			},
		},
		prebuild: {
			description: "Generate native ios/ + android/ projects (expo prebuild)",
			options: {
				clean: {
					type: "boolean",
					description: "Delete existing native directories first",
					default: false,
				},
				platform: {
					type: "string",
					description: "Restrict to a single platform (ios | android)",
				},
			},
			handler: async (ctx, flags) => {
				const args = ["expo", "prebuild"];
				if (flags.clean) args.push("--clean");
				if (typeof flags.platform === "string") {
					args.push("--platform", flags.platform);
				}
				const { ok } = runInherit("npx", args, ctx.cwd);
				if (!ok) throw new Error("expo prebuild failed");
			},
		},
		build: {
			description: "Create a native build with EAS Build (eas build)",
			options: {
				profile: {
					type: "string",
					description: "EAS build profile (defaults to the first configured)",
				},
				platform: {
					type: "string",
					description: "Target platform (ios | android | all)",
					default: "all",
				},
			},
			handler: async (ctx, flags) => {
				const profiles = await ctx.resolve(easBuildProfiles);
				const profile =
					typeof flags.profile === "string" ? flags.profile : profiles[0];
				if (!profile || !profiles.includes(profile)) {
					throw new Error(
						`Unknown EAS build profile "${profile}". Configured profiles: ${profiles.join(", ")}.`,
					);
				}
				const platform =
					typeof flags.platform === "string" ? flags.platform : "all";
				const { ok } = runInherit(
					"npx",
					["eas", "build", "--profile", profile, "--platform", platform],
					ctx.cwd,
				);
				if (!ok) throw new Error("eas build failed");
			},
		},
		update: {
			description: "Publish an OTA update with EAS Update (eas update)",
			options: {
				channel: {
					type: "string",
					description:
						"EAS Update channel (defaults to the configured channel)",
				},
				message: {
					type: "string",
					description: "Update message",
				},
			},
			handler: async (ctx, flags) => {
				const defaultChannel = await ctx.resolve(easUpdateChannel);
				const channel =
					typeof flags.channel === "string" ? flags.channel : defaultChannel;
				const args = ["eas", "update", "--channel", channel];
				if (typeof flags.message === "string") {
					args.push("--message", flags.message);
				}
				const { ok } = runInherit("npx", args, ctx.cwd);
				if (!ok) throw new Error("eas update failed");
			},
		},
	},

	contributes: (self) => [
		// Contribute the Metro dev-server localhost origin to CORS unless the
		// consumer has overridden `app.origins` entirely. Predicate is
		// `!== undefined` (not truthiness) so an explicit `app.origins: []`
		// lockdown is honoured — mirrors plugin-vite + plugin-api.
		api.slots.corsOrigins.contribute(async (ctx) => {
			if (ctx.app.origins !== undefined) return undefined;
			const port = await ctx.resolve(self.slots.devServerPort);
			return `http://localhost:${port}`;
		}),

		// Emit the four native artifacts. metro/app.config/entry always render;
		// routes.d.ts is null (skipped) when routing is disabled.
		emitArtifact(".stack/metro.config.js", self.slots.metroConfig),
		emitArtifact(".stack/app.config.ts", self.slots.expoConfig),
		emitArtifact(ENTRY_ARTIFACT, self.slots.entrySource),
		emitArtifact(".stack/routes.d.ts", self.slots.routesDtsSource),

		// Always emit the ambient-types reference: harmless without routing and
		// needed by `tsconfig.app.json` whenever Expo is present.
		cliSlots.artifactFiles.contribute(() => ({
			path: EXPO_ENV_ARTIFACT,
			content: EXPO_ENV_DTS,
		})),

		// Point the consumer's package.json `main` at the generated entry so
		// expo-router actually mounts it (and the provider stack) — without this,
		// expo-router falls back to its default entry and every contributed
		// provider is dead. Write-once. Skipped when routing is disabled: a
		// bare-RN consumer (`routes: false`) owns their own entry, and no
		// `.stack/entry.tsx` is generated to point at.
		cliSlots.packageJsonFields.contribute(async (ctx) => {
			const pagesDir = await ctx.resolve(self.slots.routesPagesDir);
			if (pagesDir === null) return undefined;
			return { main: ENTRY_ARTIFACT };
		}),

		// Root-level config files the consumer owns. The metro + app.config
		// shims re-export from `.stack/`; babel.config + eas.json are real
		// consumer-edited files.
		cliSlots.initScaffolds.contribute((ctx) =>
			ctx.scaffold("metro.config.js.template", "metro.config.js"),
		),
		cliSlots.initScaffolds.contribute((ctx) =>
			ctx.scaffold("app.config.ts.template", "app.config.ts"),
		),
		cliSlots.initScaffolds.contribute((ctx) =>
			ctx.scaffold("babel.config.js.template", "babel.config.js"),
		),
		cliSlots.initScaffolds.contribute((ctx) =>
			ctx.scaffold("eas.json.template", "eas.json"),
		),

		// Clean up the scaffolded root config files on `stack remove expo`.
		cliSlots.removeFiles.contribute(() => [
			"metro.config.js",
			"app.config.ts",
			"babel.config.js",
			"eas.json",
		]),
	],
});

export type { ExpoOptions } from "./types";
