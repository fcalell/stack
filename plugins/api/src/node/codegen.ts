import {
	dedupeImports,
	renderTsSourceFile,
	type TsExpression,
	type TsImportSpec,
	type TsSourceFile,
	type TsStatement,
} from "@fcalell/cli/ast";
import type { MiddlewarePayload, WorkerPayload } from "./types";

// ── aggregateWorker ─────────────────────────────────────────────────

export function aggregateWorker(payload: WorkerPayload): string {
	const statements: TsStatement[] = [];

	// Plugin runtimes live alongside middleware in the chain but are emitted
	// separately so late handlers can mutate their options. The order is:
	// base → pluginRuntimes (.use) → middlewareChain (.use) → handler. Plugin
	// runtimes run first so composition middleware sees the context they
	// inject (e.g. `c.var.db`, `c.var.auth`).
	const runtimeImports: TsImportSpec[] = [];
	const callbackImports: TsImportSpec[] = [];

	if (payload.base) {
		// Build: const worker = <base>.use(<rt1>).use(<rt2>)...use(<mw1>)....handler(<handler>);
		let chain: TsExpression = payload.base;
		for (const rt of payload.pluginRuntimes) {
			runtimeImports.push(rt.import);
			const properties = Object.entries(rt.options).map(([key, value]) => ({
				key,
				value,
			}));
			if (rt.callbacks) {
				properties.push({
					key: "callbacks",
					value: { kind: "identifier", name: rt.callbacks.identifier },
				});
				callbackImports.push(rt.callbacks.import);
			}
			const runtimeCall: TsExpression = {
				kind: "call",
				callee: { kind: "identifier", name: rt.identifier },
				args:
					properties.length > 0
						? [{ kind: "object", properties }]
						: [{ kind: "object", properties: [] }],
			};
			chain = {
				kind: "call",
				callee: { kind: "member", object: chain, property: "use" },
				args: [runtimeCall],
			};
		}
		for (const mw of payload.middlewareChain) {
			chain = {
				kind: "call",
				callee: { kind: "member", object: chain, property: "use" },
				args: [mw],
			};
		}
		if (payload.handler) {
			chain = {
				kind: "call",
				callee: { kind: "member", object: chain, property: "handler" },
				args: [{ kind: "identifier", name: payload.handler.identifier }],
			};
		} else {
			chain = {
				kind: "call",
				callee: { kind: "member", object: chain, property: "handler" },
				args: [],
			};
		}

		statements.push({ kind: "const", name: "worker", value: chain });
		statements.push({
			kind: "export-type",
			name: "AppRouter",
			// `typeof <expr>` isn't a first-class TsTypeRef kind; rendering as a
			// bare `reference` pastes the text verbatim which is what we want.
			type: { kind: "reference", name: "typeof worker._router" },
		});
		statements.push({
			kind: "export-default",
			value: { kind: "identifier", name: "worker" },
		});
	}

	const spec: TsSourceFile = {
		imports: dedupeImports([
			...payload.imports,
			...runtimeImports,
			...callbackImports,
		]),
		statements,
	};

	const rendered = renderTsSourceFile(spec);
	return rendered.endsWith("\n") ? rendered : `${rendered}\n`;
}

// ── aggregateMiddleware ─────────────────────────────────────────────

const MIDDLEWARE_PHASE_ORDER: Record<
	MiddlewarePayload["entries"][number]["phase"],
	number
> = {
	"before-cors": 0,
	"after-cors": 1,
	"before-routes": 2,
	"after-routes": 3,
};

// Returns the ordered middleware call expressions plus the imports needed for
// them. Consumed by the worker pipeline: plugin-api emits api.events.Middleware
// first, then seeds api.events.Worker's `imports` + `middlewareChain` with the
// result before emitting the Worker event.
//
// Ordering: primary key is `phase` (before-cors < after-cors < before-routes <
// after-routes); secondary key is `order` (ascending). Stable within ties.
export function aggregateMiddleware(
	payload: MiddlewarePayload,
): { imports: TsImportSpec[]; calls: TsExpression[] } | null {
	if (payload.entries.length === 0) return null;

	const indexed = payload.entries.map((entry, idx) => ({ entry, idx }));
	indexed.sort((a, b) => {
		const phaseA = MIDDLEWARE_PHASE_ORDER[a.entry.phase];
		const phaseB = MIDDLEWARE_PHASE_ORDER[b.entry.phase];
		if (phaseA !== phaseB) return phaseA - phaseB;
		if (a.entry.order !== b.entry.order) return a.entry.order - b.entry.order;
		return a.idx - b.idx;
	});

	const calls = indexed.map(({ entry }) => entry.call);
	const imports = dedupeImports(indexed.flatMap(({ entry }) => entry.imports));
	return { imports, calls };
}
