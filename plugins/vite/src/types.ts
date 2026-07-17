import type { TsExpression, TsImportSpec } from "@fcalell/cli/ast";
import { z } from "zod";

// Restart policy for vite's dev process. Defaults to "never" because vite
// already handles HMR; restarting on crash usually masks the underlying bug.
// Exposed so a consumer can opt into "on-crash" / "always" if they have a
// reason (e.g. flaky upstream dependency).
const restartPolicySchema = z.enum(["never", "on-crash", "always"]);

export const viteOptionsSchema = z.object({
	port: z.number().int().min(1).max(65535).optional(),
	restart: restartPolicySchema.optional(),
	maxRestarts: z.number().int().min(0).optional(),
});

export type ViteOptions = z.input<typeof viteOptionsSchema>;

// A dev-server proxy rule rendered into the generated config's
// `server.proxy`. `ws: true` also forwards WebSocket upgrades.
export interface ServerProxyEntry {
	path: string;
	target: string;
	ws?: boolean;
}

// Pure aggregator input shape consumed by the `aggregateViteConfig` helper
// (which lives in node/codegen.ts and plugs into the `vite.slots.viteConfig`
// derivation). Kept as a first-class type so the aggregator stays testable
// in isolation — the plugin index wires slot values into this shape.
export interface CodegenViteConfigPayload {
	imports: TsImportSpec[];
	pluginCalls: TsExpression[];
	resolveAliases: Array<{ find: string; replacement: string }>;
	devServerPort: number;
	serverProxy: ServerProxyEntry[];
	// Extra `server.fs.allow` path expressions. Any entry switches the
	// rendered config to an explicit allow list, so the aggregator prepends
	// the consumer's own workspace root (Vite disables its auto-detection
	// the moment a custom list is set).
	fsAllow: TsExpression[];
}
