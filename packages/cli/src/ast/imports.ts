import type { TsImportSpec } from "#ast/specs";

// Merge duplicate imports from the same source. Plugins contribute imports
// independently during codegen aggregation; dedupe guarantees one well-formed
// import line per source, preserving type-only intent when every contributor
// agrees on it.
export function dedupeImports(specs: TsImportSpec[]): TsImportSpec[] {
	interface Accum {
		source: string;
		typeOnly: boolean | null;
		namedBySource: Map<string, string | { name: string; alias: string }>;
		defaults: Set<string>;
		namespaces: Set<string>;
		sideEffect: boolean;
	}

	const groups = new Map<string, Accum>();
	for (const spec of specs) {
		const existing = groups.get(spec.source);
		const accum: Accum = existing ?? {
			source: spec.source,
			typeOnly: null,
			namedBySource: new Map(),
			defaults: new Set(),
			namespaces: new Set(),
			sideEffect: false,
		};
		if (!existing) groups.set(spec.source, accum);

		if ("sideEffect" in spec) {
			accum.sideEffect = true;
			continue;
		}
		if ("default" in spec) {
			accum.defaults.add(spec.default);
			accum.typeOnly = reconcileTypeOnly(accum.typeOnly, spec.typeOnly);
			continue;
		}
		if ("namespace" in spec) {
			accum.namespaces.add(spec.namespace);
			continue;
		}
		for (const n of spec.named) {
			const key = typeof n === "string" ? n : `${n.name} as ${n.alias}`;
			if (!accum.namedBySource.has(key)) accum.namedBySource.set(key, n);
		}
		accum.typeOnly = reconcileTypeOnly(accum.typeOnly, spec.typeOnly);
	}

	const out: TsImportSpec[] = [];
	for (const g of groups.values()) {
		if (g.sideEffect) {
			out.push({ source: g.source, sideEffect: true });
		}
		for (const d of g.defaults) {
			out.push({
				source: g.source,
				default: d,
				...(g.typeOnly ? { typeOnly: true } : {}),
			});
		}
		for (const ns of g.namespaces) {
			out.push({ source: g.source, namespace: ns });
		}
		if (g.namedBySource.size > 0) {
			out.push({
				source: g.source,
				named: Array.from(g.namedBySource.values()),
				...(g.typeOnly ? { typeOnly: true } : {}),
			});
		}
	}
	return out;
}

function reconcileTypeOnly(
	current: boolean | null,
	incoming: boolean | undefined,
): boolean | null {
	const inc = incoming ?? false;
	if (current === null) return inc;
	return current && inc;
}
