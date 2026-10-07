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

// A plugin call with the imports it needs, for `vite.slots.appPlugins`.
export interface AppPlugin {
	call: TsExpression;
	imports: TsImportSpec[];
}

// The resolved values of vite's input slots, one field per slot under the
// slot's own name: `renderViteConfig` takes them as `graph.resolve` returns
// them, so a caller adjusts one field and passes the rest through.
export interface ViteConfigValues {
	configImports: TsImportSpec[];
	pluginCalls: TsExpression[];
	resolveAliases: Array<{ find: string; replacement: string }>;
	// Bare specifiers for `resolve.dedupe`: every import of one resolves from
	// the consumer's root, so a workspace-linked plugin checkout can't pull a
	// second copy of a singleton runtime into the production bundle.
	resolveDedupe: string[];
	devServerPort: number;
	// The client build's output directory, relative to the project root.
	outDir: string;
	serverProxy: ServerProxyEntry[];
	// Extra `server.fs.allow` path expressions. Any entry switches the
	// rendered config to an explicit allow list, so the renderer prepends
	// the consumer's own workspace root (Vite disables its auto-detection
	// the moment a custom list is set).
	fsAllow: TsExpression[];
	// Globs rendered into `server.watch.ignored`, which Vite adds to its own
	// defaults (`.git`, `node_modules`, its cache dir).
	watchIgnored: string[];
	// Headers rendered into `server.headers`, names sorted.
	clientHeaders: Record<string, string>;
}
