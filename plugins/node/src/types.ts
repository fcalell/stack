import type { TsExpression, TsImportSpec } from "@fcalell/cli/ast";
import { z } from "zod";

export const nodeOptionsSchema = z.object({
	port: z.number().int().min(1).max(65535).default(8788),
});

export type NodeOptions = z.input<typeof nodeOptionsSchema>;

// A plugin's codegen contribution to the generated server's `services`
// array: a statically imported ServiceSpec (or ServiceSpec[]) expression.
// Static entries must not import "virtual:stack-procedure" (their modules
// resolve before startNodeServer registers the hook); the consumer's own
// services load through `servicesModule` instead.
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
	hasConsumerServices: boolean;
	services: ServiceEntry[];
}
