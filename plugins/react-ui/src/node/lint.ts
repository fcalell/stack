import { posix } from "node:path";
import type { LintPlugin } from "@fcalell/cli/specs";

// The `.grit` files of this package's `lint/`, each a rule of the web rules
// page (`guide/rules.md`), in the order its table lists them.
export const LINT_RULES = [
	"no-class-on-component",
	"no-host-look",
	"no-arbitrary-value",
	"no-raw-style",
	"no-img",
	"no-density",
	"no-map-rows",
] as const;

// The rules run on the app's own sources: the directory its routes sit in, or
// `src` (the stylesheet's `@source`) when file routing is off. A routes
// directory at the project's root leaves the whole project.
export function lintPlugins(routesDir: string | null): LintPlugin[] {
	const appDir = routesDir === null ? "src" : posix.dirname(routesDir);
	const includes = [appDir === "." ? "**" : `${appDir}/**`];
	return LINT_RULES.map((rule) => ({
		path: `@fcalell/plugin-react-ui/lint/${rule}.grit`,
		includes,
	}));
}
