import type { TsExpression, TsImportSpec } from "@fcalell/cli/ast";
import { z } from "zod";

export const viteOptionsSchema = z.object({
	port: z.number().optional(),
});

export type ViteOptions = z.input<typeof viteOptionsSchema>;

export interface CodegenViteConfigPayload {
	imports: TsImportSpec[];
	pluginCalls: TsExpression[];
	resolveAliases: Array<{ find: string; replacement: string }>;
	devServerPort: number;
}
