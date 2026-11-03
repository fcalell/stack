import type { TsExpression, TsImportSpec } from "@fcalell/cli/ast";
import { z } from "zod";

export const nodeOptionsSchema = z.object({
	port: z.number().int().min(1).max(65535).default(8788),
	// The address the server binds. Unset binds every interface; a server
	// behind a proxy, or one that must stay off the network, names loopback.
	host: z.string().min(1).optional(),
	// Bytes: a request body over `body` is refused with 413, and a
	// WebSocket frame over `frame` closes its socket.
	bounds: z
		.object({
			body: z
				.number()
				.int()
				.positive()
				.default(16 * 1024 * 1024),
			frame: z
				.number()
				.int()
				.positive()
				.default(1024 * 1024),
		})
		.default({ body: 16 * 1024 * 1024, frame: 1024 * 1024 }),
});

export type NodeOptions = z.input<typeof nodeOptionsSchema>;
export type NodeOptionsResolved = z.output<typeof nodeOptionsSchema>;

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

// What a plugin adds to the production bundle (`stack build`): a task the
// bundled server runs before it listens (a function the expression evaluates to,
// `() => void | Promise<void>`: db applies its migrations), and files copied
// beside the bundle for it to read at run time. Dev runs neither: it runs the
// sources, and db pushes the schema.
export interface BundleEntry {
	name: string;
	imports?: TsImportSpec[];
	boot?: TsExpression;
	copy?: Array<{
		// A file or directory relative to the project root.
		from: string;
		// Its place relative to the bundle's directory.
		to: string;
		// Which files under `from` are copied (a path relative to `from`); all by default.
		only?: (path: string) => boolean;
	}>;
}

// Pure aggregator input consumed by `aggregateServer` (node/codegen.ts),
// wired from slot values by the plugin index. First-class type so the
// aggregator stays testable in isolation.
export interface CodegenServerPayload {
	port: number;
	host: string | null;
	bounds: { body: number; frame: number };
	hasWorker: boolean;
	workerPaths: string[];
	// The web client's build directory, relative to the project root; null
	// when there is no web client.
	staticRoot: string | null;
	// Headers the static files and the shell carry; rendered only with a
	// static root.
	clientHeaders: Record<string, string>;
	hasConsumerServices: boolean;
	services: ServiceEntry[];
	// Set for the production bundle's entry: the worker and the consumer's
	// services are imported, not loaded by URL, the web client is found beside
	// the bundle, and the entries' boot tasks run before it listens.
	bundle?: {
		staticDir: string | null;
		imports: TsImportSpec[];
		boot: TsExpression[];
	};
}
