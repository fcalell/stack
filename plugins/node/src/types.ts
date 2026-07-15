import type { TsExpression, TsImportSpec } from "@fcalell/cli/ast";
import { z } from "zod";

export const nodeOptionsSchema = z.object({
	port: z.number().int().min(1).max(65535).default(8788),
});

export type NodeOptions = z.input<typeof nodeOptionsSchema>;

// A codegen contribution to the generated server's `services` array. The
// expression evaluates at runtime to a ServiceSpec or a ServiceSpec array
// (the runtime flattens), so the consumer barrel can hand over its whole
// `services` export as one entry.
export interface ServiceEntry {
	name: string;
	imports: TsImportSpec[];
	expression: TsExpression;
}

// Pure aggregator input consumed by `aggregateServer` (node/codegen.ts),
// wired from slot values by the plugin index. First-class type so the
// aggregator stays testable in isolation.
export interface CodegenServerPayload {
	port: number;
	hasWorker: boolean;
	workerPaths: string[];
	services: ServiceEntry[];
}
