import type {
	HtmlInjection,
	ProviderSpec,
	TsExpression,
	TsImportSpec,
} from "@fcalell/cli/ast";
import { z } from "zod";

export const reactOptionsSchema = z.object({
	// The consumer's TanStack Router routes directory, relative to the
	// project root; `false` turns file-based routing off.
	routes: z
		.union([
			z.literal(false),
			z.object({
				dir: z.string().min(1, "dir cannot be empty").optional(),
			}),
		])
		.optional(),
	title: z.string().optional(),
	description: z.string().optional(),
	icon: z.string().optional(),
	themeColor: z.string().optional(),
	lang: z.string().optional(),
});

export type ReactOptions = z.input<typeof reactOptionsSchema>;

// ── Codegen payload types (owned by plugin-react) ───────────────────

// The options of TanStack's router plugin, as data: the app's config runs the
// plugin on them as they are and a host that draws the screens changes one.
export interface RouterOptions {
	autoCodeSplitting: boolean;
	// Expressions evaluated in the generated `.stack/` config.
	routesDirectory: TsExpression;
	generatedRouteTree: TsExpression;
}

// The root mount: verbatim statements and the imports they need, so the
// plugin that mounts brings its own and no other plugin's imports go unused
// in the entry.
export interface Mount {
	imports: TsImportSpec[];
	body: string;
}

export interface CodegenEntryPayload {
	imports: TsImportSpec[];
	// The mount, or null to skip entry.tsx.
	mount: Mount | null;
}

export interface CodegenHtmlPayload {
	shell: URL | null;
	head: HtmlInjection[];
	bodyEnd: HtmlInjection[];
}

// ── Composition payload types (owned by plugin-react) ───────────────

export interface CompositionProvidersPayload {
	providers: ProviderSpec[];
}
