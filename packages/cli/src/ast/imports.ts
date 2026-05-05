import type { TsImportSpec } from "#ast/specs";

// Merge contributions to `.stack/*.ts` import statements. Plugins emit imports
// independently during codegen aggregation; merging guarantees one well-formed
// import line per source. Conflicting contributions throw — silent dedupe used
// to swallow real disagreements (two plugins binding the same local name to
// different exports), so any disagreement now surfaces with an actionable
// error instead of producing wrong code at runtime.
export function dedupeImports(specs: TsImportSpec[]): TsImportSpec[] {
	interface Accum {
		source: string;
		// Tracked as `null` until any contribution lands. After that:
		// - named imports: every contribution must agree on `typeOnly`.
		// - default import: every default contribution must agree on `typeOnly`.
		// They're tracked separately because the printer emits them as separate
		// statements, so their `typeOnly` intent is independent.
		namedTypeOnly: boolean | null;
		defaultTypeOnly: boolean | null;
		// local-name -> imported-name mapping. For `named: ["foo"]`, both names
		// are `"foo"`. For `named: [{ name: "bar", alias: "foo" }]`, local is
		// `"foo"` and imported is `"bar"`. Two contributions producing the same
		// local with different imported names is a hard conflict.
		namedByLocal: Map<string, { imported: string; alias: string | null }>;
		// Plain default imports: `import D from "foo"`. At most one distinct `D`
		// per source — same string from N contributors collapses, different
		// strings throw.
		defaultName: string | null;
		// Plain namespace imports: `import * as NS from "foo"`. Tracked per
		// source. Cross-source uniqueness of `NS` is enforced after grouping
		// (same alias against different sources throws).
		namespaces: Set<string>;
		sideEffect: boolean;
	}

	const groups = new Map<string, Accum>();
	for (const spec of specs) {
		const accum: Accum = groups.get(spec.source) ?? {
			source: spec.source,
			namedTypeOnly: null,
			defaultTypeOnly: null,
			namedByLocal: new Map(),
			defaultName: null,
			namespaces: new Set(),
			sideEffect: false,
		};
		if (!groups.has(spec.source)) groups.set(spec.source, accum);

		if ("sideEffect" in spec) {
			accum.sideEffect = true;
			continue;
		}
		if ("default" in spec) {
			if (accum.defaultName !== null && accum.defaultName !== spec.default) {
				throw new Error(
					`dedupeImports: conflicting default imports for "${spec.source}" — ` +
						`"${accum.defaultName}" vs "${spec.default}". A module can be ` +
						`bound to only one local name in a single file; reconcile the ` +
						`contributing plugins.`,
				);
			}
			accum.defaultName = spec.default;
			accum.defaultTypeOnly = reconcileTypeOnly(
				accum.defaultTypeOnly,
				spec.typeOnly,
				`conflicting \`typeOnly\` for the default import of "${spec.source}" ` +
					`("${spec.default}") — every contributor must agree.`,
			);
			continue;
		}
		if ("namespace" in spec) {
			accum.namespaces.add(spec.namespace);
			continue;
		}
		// Named bindings.
		for (const n of spec.named) {
			const imported = typeof n === "string" ? n : n.name;
			const local = typeof n === "string" ? n : n.alias;
			const alias = typeof n === "string" ? null : n.alias;
			const existing = accum.namedByLocal.get(local);
			if (existing && existing.imported !== imported) {
				throw new Error(
					`dedupeImports: conflicting named imports for "${spec.source}" — ` +
						`local name "${local}" bound to both "${existing.imported}" and ` +
						`"${imported}". Either rename one alias or reconcile contributors.`,
				);
			}
			if (!existing) {
				accum.namedByLocal.set(local, { imported, alias });
			}
		}
		accum.namedTypeOnly = reconcileTypeOnly(
			accum.namedTypeOnly,
			spec.typeOnly,
			`conflicting \`typeOnly\` for the named import line from "${spec.source}" ` +
				`— every contributor must agree (some marked it \`type\`, others didn't).`,
		);
	}

	// Cross-source check: namespace alias uniqueness. `import * as NS from "a"`
	// and `import * as NS from "b"` would shadow each other in the emitted file.
	const namespaceOwners = new Map<string, string>();
	for (const g of groups.values()) {
		for (const ns of g.namespaces) {
			const prior = namespaceOwners.get(ns);
			if (prior && prior !== g.source) {
				throw new Error(
					`dedupeImports: namespace alias "${ns}" is bound to both ` +
						`"${prior}" and "${g.source}". Pick a different alias on one of ` +
						`the contributing plugins.`,
				);
			}
			namespaceOwners.set(ns, g.source);
		}
	}

	const out: TsImportSpec[] = [];
	for (const g of groups.values()) {
		if (g.sideEffect) {
			out.push({ source: g.source, sideEffect: true });
		}
		if (g.defaultName !== null) {
			out.push({
				source: g.source,
				default: g.defaultName,
				...(g.defaultTypeOnly ? { typeOnly: true } : {}),
			});
		}
		for (const ns of g.namespaces) {
			out.push({ source: g.source, namespace: ns });
		}
		if (g.namedByLocal.size > 0) {
			const named = Array.from(g.namedByLocal.values()).map(
				({ imported, alias }) =>
					alias === null ? imported : { name: imported, alias },
			);
			out.push({
				source: g.source,
				named,
				...(g.namedTypeOnly ? { typeOnly: true } : {}),
			});
		}
	}
	return out;
}

function reconcileTypeOnly(
	current: boolean | null,
	incoming: boolean | undefined,
	message: string,
): boolean {
	const inc = incoming ?? false;
	if (current === null) return inc;
	if (current !== inc) throw new Error(`dedupeImports: ${message}`);
	return current;
}
