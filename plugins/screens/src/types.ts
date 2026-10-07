import type { TsImportSpec } from "@fcalell/cli/ast";
import type { AppPlugin } from "@fcalell/plugin-vite";
import type { ViteConfigValues } from "@fcalell/plugin-vite/node";

// One toolbar global a plugin pins on the document root before a story's first
// paint (a mode, a density): data the host applies without knowing the design
// system that reads it.
export interface PreviewGlobal {
	// The key in Storybook's globals.
	name: string;
	// The toolbar's label.
	title: string;
	// The values the toolbar offers.
	values: string[];
	// The value a story opens with; one of `values`.
	default: string;
	// How the chosen value reaches the root: `attribute` sets it, `classes` adds
	// the class named for the value (a value with no entry adds none) and removes
	// the others.
	apply: { attribute: string } | { classes: Record<string, string> };
}

// The resolved slot values the screens host's Vite config renders from: vite's
// own inputs, and what the entry holds that a story renders with.
export interface ScreensConfigValues extends ViteConfigValues {
	// The routes directory, relative to the project root.
	routesDir: string;
	// The router plugin the app's config runs, which the host runs too.
	routerPlugin: AppPlugin;
	// The entry's imports: its side-effect ones (the stylesheet) are the stories'.
	entryImports: TsImportSpec[];
	// The entry's calls with its router, as named imports.
	routerBindings: TsImportSpec[];
	// The URL prefixes the worker owns.
	prefixes: string[];
	// Modules whose default export is the MSW handlers of endpoints a plugin
	// owns, answered beside the app's procedures.
	handlerModules: string[];
	// The toolbar globals the plugins contribute.
	previewGlobals: PreviewGlobal[];
}
