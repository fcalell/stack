import type {
	HtmlInjection,
	ProviderSpec,
	TsImportSpec,
} from "@fcalell/cli/ast";
import { z } from "zod";

export const solidOptionsSchema = z.object({
	routes: z
		.union([
			z.literal(false),
			z.object({
				pagesDir: z.string().min(1, "pagesDir cannot be empty").optional(),
			}),
		])
		.optional(),
	title: z.string().optional(),
	description: z.string().optional(),
	icon: z.string().optional(),
	themeColor: z.string().optional(),
	lang: z.string().optional(),
});

export type SolidOptions = z.input<typeof solidOptionsSchema>;

// ── Codegen payload types (owned by plugin-solid) ───────────────────

// The root mount: a verbatim source expression and the imports it needs,
// so the plugin that mounts brings its own and no other plugin's imports
// go unused in the entry.
export interface Mount {
	imports: TsImportSpec[];
	expression: string;
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

export interface CodegenRoutesDtsPayload {
	pagesDir: string | null;
}

// ── Composition payload types (owned by plugin-solid) ───────────────

export interface CompositionProvidersPayload {
	providers: ProviderSpec[];
}
