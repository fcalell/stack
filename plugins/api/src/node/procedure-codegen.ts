import {
	dedupeImports,
	renderTsSourceFile,
	type TsExpression,
	type TsImportSpec,
} from "@fcalell/cli/ast";
import { type PluginRuntimeEntry, ROUTES_BARREL_IMPORT_SOURCE } from "./types";

// ── aggregateProcedure ────────────────────────────────────────────────
//
// Renders `.stack/procedure.ts` — the `virtual:stack-procedure` target the
// README documents. Consumer route files (`src/worker/routes/*.ts`) import
// `procedure` from here via a tsconfig `paths` alias (see
// `packages/cli/src/templates/tsconfig.ts`).
//
// `TContext` (the type argument to `createProcedure`) has to match the real
// request context `.stack/worker.ts` builds at runtime — same runtime
// plugins, same options, same `.use()` order, AND the same consumer
// middleware chain: a context-injecting middleware (arity-1 `(ctx) => extra`,
// see `AppBuilder.use`'s third overload in `../worker/index.ts`) extends
// `TContext` just like a runtime plugin does. Skipping it here would let
// `.stack/procedure.ts` compile against a narrower context than the real
// worker builds, silently hiding a key like `requestId` that a route handler
// should see. Rather than hand-deriving each runtime factory's (or
// middleware's) generics, we rebuild the identical `.use()` chain as real
// (never-exported, never-called-further) code and let TypeScript infer
// `TContext` from it the same way it infers `AppRouter` in `.stack/worker.ts`
// (`typeof worker._router`). The runtime factories and middleware here are
// pure — constructing/referencing them without calling `.handler()` has no
// observable effect; the chain exists purely so `typeof __chain` is a valid
// type query.
//
// Import-cycle note: consumer middleware (`src/worker/middleware.ts`) MUST
// NOT import from `src/worker/routes/*` — those route files import `procedure`
// from `virtual:stack-procedure` (this file), so a middleware -> routes
// import would create middleware -> routes -> procedure.ts -> middleware.
// Not a supported pattern; the route barrel exclusion below only guards the
// symmetric routes -> procedure.ts direction.
export interface ProcedurePayload {
	// Same `workerBase` (`createWorker({...})` call) the real worker uses.
	base: TsExpression;
	// Same `pluginRuntimes` the real worker uses, in the same (sorted) order.
	runtimes: PluginRuntimeEntry[];
	// The full `workerImports` list. Runtime option values sometimes reference
	// an identifier that needs its own import (e.g. db's `schema`) — that
	// import lands here, contributed alongside (not on) the `pluginRuntimes`
	// entry. The route barrel entry is filtered out below: route files import
	// `virtual:stack-procedure`, so this file importing the barrel back would
	// be a cycle.
	imports: TsImportSpec[];
	// Same `middlewareCalls` the real worker's `.use(...)` chain mounts, in
	// the same (phase + order sorted) sequence. See the cycle note above.
	middlewareChain: TsExpression[];
	// Imports the middleware call expressions need (e.g. the consumer's
	// default-exported `middleware` identifier). Never the route barrel — a
	// middleware file importing the barrel back would itself be a cycle, but
	// that's a consumer authoring error, not something this codegen guards.
	middlewareImports: TsImportSpec[];
	// Auth's RBAC action statements, contributed via `api.slots.rbacStatements`
	// (plain JSON: resource -> allowed actions). `null` when no plugin
	// contributed — `rbac` on `procedure()` falls back to
	// `Record<string, readonly string[]>` (no autocomplete narrowing).
	statements: Record<string, readonly string[]> | null;
}

const APP_BUILDER_IMPORT: TsImportSpec = {
	source: "@fcalell/plugin-api/runtime",
	named: ["AppBuilder"],
	typeOnly: true,
};

const CREATE_PROCEDURE_IMPORT: TsImportSpec = {
	source: "@fcalell/plugin-api/procedure",
	named: ["createProcedure"],
};

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

// Renders the RBAC statements record as an inline TS type literal — plain
// JSON data (resource -> readonly action-name tuple), not a cross-module
// type import. Keeps codegen self-contained: no dependency on where the
// consumer's access-control definition lives.
function renderStatementsType(
	statements: Record<string, readonly string[]> | null,
): string {
	if (statements === null) return "Record<string, readonly string[]>";
	const entries = Object.entries(statements).map(([key, actions]) => {
		const keyText = IDENT_RE.test(key) ? key : JSON.stringify(key);
		const tuple = actions.map((a) => JSON.stringify(a)).join(", ");
		return `\t${keyText}: readonly [${tuple}];`;
	});
	if (entries.length === 0) return "Record<string, readonly string[]>";
	return `{\n${entries.join("\n")}\n}`;
}

// Builds the `base.use(rt1({...})).use(rt2({...})).use(mw1)...` chain —
// structurally identical to the loop `aggregateWorker` runs (runtimes then
// middlewareChain, same order — see `../node/codegen.ts`'s `aggregateWorker`),
// minus callback splicing (callbacks are an options passthrough for runtime
// plugins' request-time behavior; they never change a `RuntimePlugin`'s
// declared `TProvides`, so omitting them here doesn't affect the derived
// context type) and minus the terminal `.handler(...)` call (this chain is
// never invoked, only typed).
function buildChain(
	base: TsExpression,
	runtimes: PluginRuntimeEntry[],
	middlewareChain: TsExpression[],
): { chain: TsExpression; imports: TsImportSpec[] } {
	let chain = base;
	const imports: TsImportSpec[] = [];
	for (const rt of runtimes) {
		imports.push(rt.import);
		const properties = Object.entries(rt.options).map(([key, value]) => ({
			key,
			value,
		}));
		const runtimeCall: TsExpression = {
			kind: "call",
			callee: { kind: "identifier", name: rt.identifier },
			args: [{ kind: "object", properties }],
		};
		chain = {
			kind: "call",
			callee: { kind: "member", object: chain, property: "use" },
			args: [runtimeCall],
		};
	}
	for (const mw of middlewareChain) {
		chain = {
			kind: "call",
			callee: { kind: "member", object: chain, property: "use" },
			args: [mw],
		};
	}
	return { chain, imports };
}

export function aggregateProcedure(payload: ProcedurePayload): string | null {
	const { chain, imports: runtimeImports } = buildChain(
		payload.base,
		payload.runtimes,
		payload.middlewareChain,
	);

	const auxiliaryImports = payload.imports.filter(
		(imp) => imp.source !== ROUTES_BARREL_IMPORT_SOURCE,
	);
	const middlewareImports = payload.middlewareImports.filter(
		(imp) => imp.source !== ROUTES_BARREL_IMPORT_SOURCE,
	);

	const importsText = renderTsSourceFile({
		imports: dedupeImports([
			...auxiliaryImports,
			...runtimeImports,
			...middlewareImports,
			APP_BUILDER_IMPORT,
			CREATE_PROCEDURE_IMPORT,
		]),
		statements: [{ kind: "const", name: "__chain", value: chain }],
	});

	const statementsType = renderStatementsType(payload.statements);

	return `${importsText}
// Type-only: \`__chain\` mirrors the runtime plugin composition in
// .stack/worker.ts so \`WorkerContext\` matches the real request context
// without re-deriving each runtime factory's generics by hand. Never
// exported or called further — only its type is used below.
type ContextOf<B> = B extends AppBuilder<infer C> ? C : never;
type WorkerContext = ContextOf<typeof __chain>;
type RbacStatements = ${statementsType};

export const procedure = createProcedure<WorkerContext, RbacStatements>();
`;
}
