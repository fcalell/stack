import type {
	HtmlInjection,
	ProviderSpec,
	TsExpression,
	TsImportSpec,
} from "@fcalell/cli/ast";
import { z } from "zod";

export const solidOptionsSchema = z.object({
	routes: z
		.union([z.literal(false), z.object({ pagesDir: z.string().optional() })])
		.optional(),
	title: z.string().optional(),
	description: z.string().optional(),
	icon: z.string().optional(),
	themeColor: z.string().optional(),
	lang: z.string().optional(),
});

export type SolidOptions = z.input<typeof solidOptionsSchema>;

// ── Codegen payload types (owned by plugin-solid) ───────────────────

export interface CodegenEntryPayload {
	imports: TsImportSpec[];
	mountExpression: TsExpression | null;
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
