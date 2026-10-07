import { existsSync } from "node:fs";
import { join } from "node:path";
import type { PreviewGlobal } from "../types.ts";

export interface ScreensModuleOptions {
	// The generated `.stack` directory, absolute.
	stackDir: string;
	// The app's fixtures module, relative to `stackDir`; absent files are fine.
	fixtures: string;
	// The entry's side-effect imports (the stylesheet), as the entry writes them.
	entryImports: string[];
	// The functions the entry calls with its router.
	routerBindings: Array<{ source: string; name: string }>;
	// The URL prefixes the worker owns: each is answered from the fixtures.
	prefixes: string[];
	// Modules whose default export is the handlers of endpoints a plugin owns.
	handlerModules: string[];
	// The toolbar globals the plugins contribute.
	previewGlobals: PreviewGlobal[];
}

// The route tree the router plugin writes, beside the generated config.
const ROUTE_TREE = "routeTree.gen.ts";

// A specifier the entry wrote relative to `.stack/` as an absolute path, any
// other as it is.
function fromStack(stackDir: string, specifier: string): string {
	return specifier.startsWith(".") ? join(stackDir, specifier) : specifier;
}

// `virtual:stack-screens`: what the entry holds that a story renders with,
// the app's route tree, its fixtures and the handlers of the endpoints its
// plugins own.
export function screensModule(options: ScreensModuleOptions): string {
	const { stackDir } = options;
	const fixtures = join(stackDir, options.fixtures);
	const bindings = options.routerBindings.map(
		(binding, index) =>
			`import { ${binding.name} as bind${index} } from ${JSON.stringify(fromStack(stackDir, binding.source))};`,
	);
	const modules = options.handlerModules.map(
		(source, index) =>
			`import handlers${index} from ${JSON.stringify(fromStack(stackDir, source))};`,
	);
	return [
		...options.entryImports.map(
			(source) => `import ${JSON.stringify(fromStack(stackDir, source))};`,
		),
		...bindings,
		...modules,
		`import { routeTree } from ${JSON.stringify(join(stackDir, ROUTE_TREE))};`,
		existsSync(fixtures)
			? `import fixtures from ${JSON.stringify(fixtures)};`
			: "const fixtures = undefined;",
		"",
		"export { fixtures, routeTree };",
		`export const prefixes = ${JSON.stringify(options.prefixes)};`,
		`export const previewGlobals = ${JSON.stringify(options.previewGlobals)};`,
		`export const handlers = [${options.handlerModules.map((_, index) => `...handlers${index}`).join(", ")}];`,
		`export function bindRouter(router) { ${options.routerBindings.map((_, index) => `bind${index}(router);`).join(" ")} }`,
		"",
	].join("\n");
}
