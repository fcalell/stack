import { plugin, slot } from "@fcalell/cli";
import type { ProviderSpec, TsExpression } from "@fcalell/cli/ast";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { expo } from "@fcalell/plugin-expo";
import { DEFAULT_BASE_TOKENS, DEFAULT_THEMES } from "./defaults";
import { aggregateGlobalCss } from "./node/codegen";
import {
	type NativeFontEntry,
	type NativeUiOptions,
	nativeUiOptionsSchema,
	type ThemeSpec,
} from "./types";

const SOURCE = "native-ui";

// Generated uniwind entry stylesheet + its build-time type output. Both land
// under `.stack/` (already gitignored). The Metro wrapper paths are resolved
// relative to Metro's projectRoot — the consumer root (see plugin-expo's
// generated metro.config) — so they point back into `.stack/`. The stylesheet's
// own `@source` roots stay relative to the file in `.stack/` (e.g. `../src`).
const GLOBAL_CSS_ARTIFACT = ".stack/global.css";
const UNIWIND_CSS_ENTRY = "./.stack/global.css";
const UNIWIND_DTS = "./.stack/uniwind-types.d.ts";

// uniwind ships `light` / `dark` / `system` out of the box; any other theme
// name must be registered via the Metro `extraThemes` option.
const BUILTIN_THEMES = new Set(["light", "dark", "system"]);

// `@source` roots are relative to global.css (in `.stack/`). uniwind scans for
// classNames from the stylesheet's directory, so without these it would only
// see `.stack/` and miss the consumer app + this plugin's primitives.
const SOURCES = ["../src", "../node_modules/@fcalell/plugin-native-ui/src"];

// The consumer configures the native clients in `src/lib/` (see the
// native-provider-wiring decision); these defaults point the provider wiring at
// that convention. Paths are relative to `.stack/entry.tsx`. Overridable via
// options for non-conventional layouts.
const DEFAULT_AUTH_MODULE = { source: "../src/lib/auth", export: "authClient" };
const DEFAULT_QUERY_MODULE = {
	source: "../src/lib/query",
	export: "queryClient",
};

// `withUniwindConfig` must wrap every other Metro plugin (uniwind's
// requirement). Metro wrappers apply ascending by `order`, so the highest order
// is applied last = outermost.
const UNIWIND_METRO_ORDER = 100;

// ── Slot declarations ──────────────────────────────────────────────

// Resolved themes — consumer `themeTokens` option or the neutral defaults.
// Mirrors solid-ui's `fonts` derivation: `??` only swaps in defaults on nullish
// (the option schema already forbids an empty array).
const themeTokens = slot.derived<ThemeSpec[], Record<string, never>>({
	source: SOURCE,
	name: "themeTokens",
	inputs: {},
	compute: (_inp, ctx) => {
		const opts = (ctx.options ?? {}) as NativeUiOptions;
		return opts.themeTokens ?? DEFAULT_THEMES;
	},
});

// Resolved fonts — consumer `fonts` option or none.
const fonts = slot.derived<NativeFontEntry[], Record<string, never>>({
	source: SOURCE,
	name: "fonts",
	inputs: {},
	compute: (_inp, ctx) => {
		const opts = (ctx.options ?? {}) as NativeUiOptions;
		return opts.fonts ?? [];
	},
});

// Extra CSS `@import`s aggregated into global.css (beyond tailwindcss+uniwind).
const appCssImports = slot.list<string>({
	source: SOURCE,
	name: "appCssImports",
});

// Rendered `.stack/global.css`. Always emits — uniwind needs the entry file
// whenever native-ui is in the config.
const appCssSource = slot.derived<
	string | null,
	{
		themes: typeof themeTokens;
		fontEntries: typeof fonts;
		imports: typeof appCssImports;
	}
>({
	source: SOURCE,
	name: "appCssSource",
	inputs: { themes: themeTokens, fontEntries: fonts, imports: appCssImports },
	compute: (inp) =>
		aggregateGlobalCss({
			themes: inp.themes,
			fonts: inp.fontEntries,
			baseTokens: DEFAULT_BASE_TOKENS,
			sources: SOURCES,
			extraImports: inp.imports,
		}),
});

// ── Provider specs ─────────────────────────────────────────────────
//
// Composed around `<ExpoRoot>` in `.stack/entry.tsx`, outer → inner by `order`.
// GestureHandlerRootView must be outermost; the gorhom bottom-sheet modal host
// sits inside the gesture + safe-area context; Auth/Query providers are
// innermost (closest to the screens that read them via hooks). No ThemeProvider
// — uniwind theming is CSS-first (global `Uniwind.setTheme`), not context-based.

const FLEX_FILL: TsExpression = {
	kind: "object",
	properties: [{ key: "flex", value: { kind: "number", value: 1 } }],
};

const gestureProvider: ProviderSpec = {
	imports: [
		{
			source: "react-native-gesture-handler",
			named: ["GestureHandlerRootView"],
		},
	],
	wrap: {
		identifier: "GestureHandlerRootView",
		props: [{ name: "style", value: FLEX_FILL }],
	},
	order: 0,
};

const keyboardProvider: ProviderSpec = {
	imports: [
		{ source: "react-native-keyboard-controller", named: ["KeyboardProvider"] },
	],
	wrap: { identifier: "KeyboardProvider" },
	order: 10,
};

const safeAreaProvider: ProviderSpec = {
	imports: [
		{ source: "react-native-safe-area-context", named: ["SafeAreaProvider"] },
	],
	wrap: { identifier: "SafeAreaProvider" },
	order: 20,
};

const bottomSheetProvider: ProviderSpec = {
	imports: [
		{ source: "@gorhom/bottom-sheet", named: ["BottomSheetModalProvider"] },
	],
	wrap: { identifier: "BottomSheetModalProvider" },
	order: 30,
};

function queryProvider(opts: NativeUiOptions): ProviderSpec {
	const mod = opts.queryClientModule ?? DEFAULT_QUERY_MODULE;
	return {
		imports: [
			{
				source: "@fcalell/plugin-api/tanstack-query",
				named: ["QueryProvider"],
			},
			{ source: mod.source, named: [mod.export] },
		],
		wrap: {
			identifier: "QueryProvider",
			props: [
				{ name: "client", value: { kind: "identifier", name: mod.export } },
			],
		},
		order: 40,
	};
}

function authProvider(opts: NativeUiOptions): ProviderSpec {
	const mod = opts.authClientModule ?? DEFAULT_AUTH_MODULE;
	return {
		imports: [
			{ source: "@fcalell/plugin-auth/expo", named: ["AuthProvider"] },
			{ source: mod.source, named: [mod.export] },
		],
		wrap: {
			identifier: "AuthProvider",
			props: [
				{ name: "client", value: { kind: "identifier", name: mod.export } },
			],
		},
		order: 50,
	};
}

export const nativeUi = plugin<
	"native-ui",
	NativeUiOptions,
	{
		themeTokens: typeof themeTokens;
		fonts: typeof fonts;
		appCssImports: typeof appCssImports;
		appCssSource: typeof appCssSource;
	}
>("native-ui", {
	label: "Native Design System",

	schema: nativeUiOptionsSchema,

	// Slot-graph dependency is expo (we contribute into its slots). api + auth
	// are required because the wired Query/Auth providers import their native
	// subpaths; presence-only, for a clear error if a consumer forgets them.
	requires: ["expo", "api", "auth"],

	// Consumer dependencies. Native module versions are Expo-SDK-56 ballpark;
	// `expo install` reconciles exact versions at consumer setup.
	dependencies: {
		"@fcalell/plugin-native-ui": "workspace:*",
		uniwind: "^1.8.0",
		"react-native-gesture-handler": "^3.0.0",
		"react-native-reanimated": "^4.4.1",
		"react-native-worklets": "^0.9.0",
		"react-native-safe-area-context": "^5.6.0",
		"react-native-keyboard-controller": "^1.18.0",
		"@gorhom/bottom-sheet": "^5.2.14",
		"lucide-react-native": "^1.17.0",
		"expo-font": "~56.0.0",
		"expo-secure-store": "~56.0.0",
		"@tanstack/react-query": "^5.101.0",
		"@orpc/tanstack-query": "^1.14.4",
		"@better-auth/expo": "^1.6.14",
	},

	slots: {
		themeTokens,
		fonts,
		appCssImports,
		appCssSource,
	},

	contributes: (self) => [
		// ── uniwind Metro integration ────────────────────────────────────
		expo.slots.metroConfigImports.contribute(() => ({
			names: ["withUniwindConfig"],
			module: "uniwind/metro",
		})),
		expo.slots.metroPluginCalls.contribute(async (ctx) => {
			const themes = await ctx.resolve(self.slots.themeTokens);
			const extraThemes = themes
				.map((t) => t.name)
				.filter((name) => !BUILTIN_THEMES.has(name));
			const options: Record<string, unknown> = {
				cssEntryFile: UNIWIND_CSS_ENTRY,
				dtsFile: UNIWIND_DTS,
			};
			if (extraThemes.length > 0) options.extraThemes = extraThemes;
			return {
				callee: "withUniwindConfig",
				options,
				order: UNIWIND_METRO_ORDER,
			};
		}),

		// ── expo-font: embed contributed font files natively ──────────────
		expo.slots.expoConfigPlugins.contribute(async (ctx) => {
			const fontEntries = await ctx.resolve(self.slots.fonts);
			const files = fontEntries
				.map((f) => f.source)
				.filter((src): src is string => typeof src === "string");
			if (files.length === 0) return undefined;
			return { name: "expo-font", options: { fonts: files } };
		}),

		// ── Provider composition (outer → inner) ─────────────────────────
		expo.slots.providers.contribute(() => gestureProvider),
		expo.slots.providers.contribute(() => keyboardProvider),
		expo.slots.providers.contribute(() => safeAreaProvider),
		expo.slots.providers.contribute(() => bottomSheetProvider),
		expo.slots.providers.contribute((ctx) =>
			queryProvider((ctx.options ?? {}) as NativeUiOptions),
		),
		expo.slots.providers.contribute((ctx) =>
			authProvider((ctx.options ?? {}) as NativeUiOptions),
		),

		// ── Emit the uniwind entry stylesheet ─────────────────────────────
		emitArtifact(GLOBAL_CSS_ARTIFACT, self.slots.appCssSource),

		// ── Scaffold the native client modules the entry imports ──────────
		//
		// The generated `.stack/entry.tsx` imports `queryClient` / `authClient`
		// from `src/lib/{query,auth}.ts` (the provider defaults above). Without a
		// scaffold those files don't exist and the app won't compile, so seed
		// editable starters — copy-once, like the auth callback file. Skipped
		// when the consumer points a provider at their own module via
		// `queryClientModule` / `authClientModule`; that path is theirs to own.
		cliSlots.initScaffolds.contribute((ctx) => {
			const opts = (ctx.options ?? {}) as NativeUiOptions;
			if (opts.queryClientModule) return undefined;
			return ctx.scaffold("lib-query.ts", "src/lib/query.ts");
		}),
		cliSlots.initScaffolds.contribute((ctx) => {
			const opts = (ctx.options ?? {}) as NativeUiOptions;
			if (opts.authClientModule) return undefined;
			return ctx.scaffold("lib-auth.ts", "src/lib/auth.ts");
		}),
		cliSlots.removeFiles.contribute(() => [
			"src/lib/query.ts",
			"src/lib/auth.ts",
		]),
	],
});

export type { NativeFontEntry, NativeUiOptions, ThemeSpec } from "./types";
