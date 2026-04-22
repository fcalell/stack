import type {
	MiddlewareSpec,
	TsExpression,
	TsImportSpec,
} from "@fcalell/cli/ast";

// A plugin's runtime contribution to the worker chain. Captured structurally
// so the worker derivation can attach callbacks and render options uniformly.
//
// `options` is keyed (insertion-ordered) so contributors can construct them
// without caring about rendering order; the aggregator emits one `{ key: value }`
// entry per pair.
export interface PluginRuntimeEntry {
	plugin: string;
	// Runtime package import. Must be a `default` import (the factory is the
	// default export of `@fcalell/plugin-<name>/runtime` by convention).
	import: TsImportSpec;
	// Identifier used as the call callee. Derived from `import.default`; kept
	// explicit so the aggregator doesn't re-narrow the import union.
	identifier: string;
	options: Record<string, TsExpression>;
}

// Attached to pluginRuntimes by the worker derivation when a matching entry
// is present on `api.slots.callbacks`. Contributors to `api.slots.callbacks`
// push an entry keyed by their plugin name; the worker source derivation
// splices `callbacks: <identifier>` into the emitted options object and adds
// the corresponding import, structurally (no ordering dependency).
export interface CallbackSpec {
	import: TsImportSpec;
	identifier: string;
}

// Models the .stack/worker.ts builder chain (internal to the worker source
// derivation). Exposed for the `aggregateWorker` pure function so tests can
// drive the aggregator with synthetic inputs.
export interface WorkerPayload {
	imports: TsImportSpec[];
	base: TsExpression | null;
	pluginRuntimes: PluginRuntimeEntry[];
	middlewareChain: TsExpression[];
	handler: { identifier: string } | null;
	// Keyed by plugin name, matching `PluginRuntimeEntry.plugin`.
	callbacks: Record<string, CallbackSpec>;
}

// Collects ordered middleware call expressions plus the imports they need.
// The aggregator sorts entries by phase then `order` and feeds the result
// into WorkerPayload's middlewareChain.
export interface MiddlewarePayload {
	entries: MiddlewareSpec[];
}
