import type { TsExpression, TsImportSpec } from "@fcalell/cli/ast";
import { z } from "zod";

export const viteOptionsSchema = z.object({
	port: z.number().optional(),
});

export type ViteOptions = z.input<typeof viteOptionsSchema>;

// Pure aggregator input shape consumed by the `aggregateViteConfig` helper
// (which lives in node/codegen.ts and plugs into the `vite.slots.viteConfig`
// derivation). Kept as a first-class type so the aggregator stays testable
// in isolation — the plugin index wires slot values into this shape.
export interface CodegenViteConfigPayload {
	imports: TsImportSpec[];
	pluginCalls: TsExpression[];
	resolveAliases: Array<{ find: string; replacement: string }>;
	devServerPort: number;
}
