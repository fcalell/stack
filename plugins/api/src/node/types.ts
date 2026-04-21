import type {
	MiddlewareSpec,
	TsExpression,
	TsImportSpec,
} from "@fcalell/cli/ast";

// A plugin's runtime contribution to the worker chain. Captured structurally
// so late handlers (e.g. the auto-wired callback hook) can mutate the options
// map after the owner plugin has seeded it, instead of trying to reach into
// an opaque `TsExpression` built with `literal()`.
//
// `options` is keyed (insertion-ordered) so `rt.options.trustedOrigins = …`
// reads naturally; the aggregator emits one `{ key: value }` entry per pair.
export interface PluginRuntimeEntry {
	plugin: string;
	// Runtime package import. Must be a `default` import (the factory is the
	// default export of `@fcalell/plugin-<name>/runtime` by convention).
	import: TsImportSpec;
	// Identifier used as the call callee. Derived from `import.default`; kept
	// explicit so the aggregator doesn't re-narrow the import union.
	identifier: string;
	options: Record<string, TsExpression>;
	// Set by the auto-wired callback hook when `src/worker/plugins/<name>.ts`
	// exists. Causes the aggregator to splice `callbacks: <identifier>` into
	// the emitted options object and add the corresponding import.
	callbacks?: { import: TsImportSpec; identifier: string };
}

// Models the .stack/worker.ts builder chain.
//
// `base` is the root factory call (`createWorker({...})`) — claimed by
// plugin-api's own Worker handler. `middlewareChain` is the output of
// `api.events.Middleware` (`.use(arg)` arguments only).
//
// `pluginRuntimes` carries the plugin-owned `.use(<name>Runtime(…))` calls.
// They're kept structured (not flattened into middlewareChain expressions) so
// auto-wired hooks can still mutate `options`/`callbacks` after the owner
// plugin has seeded the entry.
export interface WorkerPayload {
	imports: TsImportSpec[];
	base: TsExpression | null;
	pluginRuntimes: PluginRuntimeEntry[];
	middlewareChain: TsExpression[];
	handler: { identifier: string } | null;
	cors: string[];
}

// Collects ordered middleware call expressions plus the imports they need.
// The aggregator sorts entries by phase then `order` and feeds the result
// into WorkerPayload's middlewareChain.
export interface MiddlewarePayload {
	entries: MiddlewareSpec[];
}
