import { log } from "@clack/prompts";
import {
	renderToml,
	type TomlDocument,
	type TomlValue,
} from "@fcalell/cli/ast";
import { parse as parseToml } from "smol-toml";
import {
	type CodegenWranglerPayload,
	DEFAULT_COMPATIBILITY_DATE,
	type WranglerBindingSpec,
} from "../types";

const GENERATED_MAIN_VALUES = new Set([
	"worker.ts",
	"./worker.ts",
	".stack/worker.ts",
	"./.stack/worker.ts",
]);

// Wrangler rejects names that aren't lowercase alphanumeric with dashes. Consumer
// app names (from `stack init`'s basename) can include dots, underscores, or
// uppercase — normalize so `wrangler types` succeeds on the generated toml.
function sanitizeWranglerName(name: string): string {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
	return slug || "stack-app";
}

export function aggregateWrangler(opts: {
	consumerWrangler: string | null;
	payload: CodegenWranglerPayload;
	name?: string;
}): string {
	// Fail-fast on conflicts across the whole wrangler namespace before
	// rendering any TOML. `[vars]` keys and top-level binding identifiers share
	// one namespace at runtime — `env.DB` is ambiguous if `DB` is both a D1
	// binding and a `[vars]` key, or two plugins both register `AUTH_SECRET`.
	assertNoNamespaceCollisions(opts.payload);

	const root: Record<string, TomlValue> = {};
	const tables: Array<{ path: string[]; entries: Record<string, TomlValue> }> =
		[];
	const arrayTables: Array<{
		path: string[];
		entries: Record<string, TomlValue>;
	}> = [];

	if (opts.consumerWrangler) {
		let parsed: Record<string, TomlValue>;
		try {
			parsed = parseToml(opts.consumerWrangler) as Record<string, TomlValue>;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			throw new Error(`Failed to parse consumer wrangler.toml: ${msg}`);
		}
		for (const [k, v] of Object.entries(parsed)) {
			root[k] = v;
		}
		if (root.main === undefined) {
			root.main = "worker.ts";
		} else if (
			typeof root.main === "string" &&
			!GENERATED_MAIN_VALUES.has(root.main)
		) {
			log.warn(
				`Custom \`main\` detected in wrangler.toml (${root.main}); stack will not override it. Ensure it re-exports from .stack/worker.ts, or remove the line to let stack manage it.`,
			);
		}
	} else {
		root.name = sanitizeWranglerName(opts.name ?? "stack-app");
		root.compatibility_date =
			opts.payload.compatibilityDate || DEFAULT_COMPATIBILITY_DATE;
		root.main = "worker.ts";
	}

	appendBindingsToTables(
		root,
		arrayTables,
		opts.payload.bindings,
		opts.payload.secrets,
		opts.payload.vars,
	);

	for (const route of opts.payload.routes) {
		if (typeof route.pattern !== "string" || route.pattern.length === 0) {
			throw new Error(
				`Invalid wrangler route: pattern is required and must be a non-empty string (got ${JSON.stringify(
					route.pattern,
				)}).`,
			);
		}
		const entry: Record<string, TomlValue> = { pattern: route.pattern };
		if (route.zone !== undefined) entry.zone = route.zone;
		if (route.customDomain !== undefined)
			entry.custom_domain = route.customDomain;
		arrayTables.push({ path: ["routes"], entries: entry });
	}

	const doc: TomlDocument = { root, tables, arrayTables };
	const out = renderToml(doc);
	return out.endsWith("\n") ? out : `${out}\n`;
}

// ── Namespace collision detection ────────────────────────────────────
//
// Every identifier that lands at the top of `env.*` — d1/kv/r2 bindings,
// rate_limiter binding names, `kind: "var"` names, `extraVars` keys, and
// `secrets[].name` — shares one flat namespace. Duplicates are runtime
// ambiguities, so we catch them at generate time with a single pass and
// report both shapes that clashed.

type NamespaceKind =
	| "d1 binding"
	| "kv namespace"
	| "r2 bucket"
	| "rate_limiter binding"
	| "var"
	| "secret"
	| "extra var";

interface NamespaceEntry {
	kind: NamespaceKind;
}

function kindFor(binding: WranglerBindingSpec): NamespaceKind {
	switch (binding.kind) {
		case "d1":
			return "d1 binding";
		case "kv":
			return "kv namespace";
		case "r2":
			return "r2 bucket";
		case "rate_limiter":
			return "rate_limiter binding";
		case "var":
			return "var";
	}
}

function idFor(binding: WranglerBindingSpec): string {
	return binding.kind === "var" ? binding.name : binding.binding;
}

function assertNoNamespaceCollisions(payload: CodegenWranglerPayload): void {
	const seen = new Map<string, NamespaceEntry[]>();

	const push = (id: string, entry: NamespaceEntry) => {
		const bucket = seen.get(id);
		if (bucket) bucket.push(entry);
		else seen.set(id, [entry]);
	};

	for (const b of payload.bindings) push(idFor(b), { kind: kindFor(b) });
	for (const s of payload.secrets) push(s.name, { kind: "secret" });
	for (const name of Object.keys(payload.vars))
		push(name, { kind: "extra var" });

	const conflicts: Array<{ id: string; entries: NamespaceEntry[] }> = [];
	for (const [id, entries] of seen) {
		if (entries.length > 1) conflicts.push({ id, entries });
	}
	if (conflicts.length === 0) return;

	const lines = conflicts.map(({ id, entries }) => {
		const shapes = entries.map((e) => e.kind).join(", ");
		return `  - "${id}" (registered as ${shapes})`;
	});
	throw new Error(
		`Duplicate wrangler identifier(s) — each name must be unique across bindings, vars, and secrets:\n${lines.join(
			"\n",
		)}\nRename one of the contributing plugins' identifiers.`,
	);
}

function appendBindingsToTables(
	root: Record<string, TomlValue>,
	arrayTables: Array<{ path: string[]; entries: Record<string, TomlValue> }>,
	bindings: WranglerBindingSpec[],
	secrets: Array<{ name: string; devDefault: string }>,
	extraVars: Record<string, string>,
): void {
	for (const b of bindings) {
		if (b.kind !== "d1") continue;
		const entry: Record<string, TomlValue> = {
			binding: b.binding,
			database_id: b.databaseId,
			database_name: b.databaseName,
		};
		if (b.migrationsDir) entry.migrations_dir = b.migrationsDir;
		arrayTables.push({ path: ["d1_databases"], entries: entry });
	}

	for (const b of bindings) {
		if (b.kind !== "kv") continue;
		arrayTables.push({
			path: ["kv_namespaces"],
			entries: { binding: b.binding, id: b.id },
		});
	}

	for (const b of bindings) {
		if (b.kind !== "r2") continue;
		arrayTables.push({
			path: ["r2_buckets"],
			entries: { binding: b.binding, bucket_name: b.bucketName },
		});
	}

	for (const b of bindings) {
		if (b.kind !== "rate_limiter") continue;
		const { limit, period } = b.simple;
		if (
			!Number.isInteger(limit) ||
			limit <= 0 ||
			!Number.isInteger(period) ||
			period <= 0
		) {
			throw new Error(
				`Invalid rate_limiter "${b.binding}": limit and period must be positive integers (got limit=${limit}, period=${period}).`,
			);
		}
		arrayTables.push({
			path: ["unsafe", "bindings"],
			entries: {
				name: b.binding,
				type: "ratelimit",
				limit,
				period,
			},
		});
	}

	const varBindings = bindings.filter(
		(b): b is Extract<WranglerBindingSpec, { kind: "var" }> => b.kind === "var",
	);
	const hasVarsSection =
		varBindings.length > 0 ||
		secrets.length > 0 ||
		Object.keys(extraVars).length > 0;

	if (hasVarsSection) {
		const vars: Record<string, TomlValue> = { ...extraVars };
		for (const v of varBindings) {
			vars[v.name] = v.value;
		}
		for (const s of secrets) {
			if (!(s.name in vars)) {
				vars[s.name] = "";
			}
		}
		const existing = root.vars;
		if (existing && typeof existing === "object" && !Array.isArray(existing)) {
			root.vars = { ...(existing as Record<string, TomlValue>), ...vars };
		} else {
			root.vars = vars;
		}
	}
}

export function aggregateDevVars(
	secrets: Array<{ name: string; devDefault: string }>,
): string | null {
	if (secrets.length === 0) return null;
	const lines = secrets.map(
		(s) => `${s.name}=${escapeDevVarValue(s.devDefault)}`,
	);
	return `${lines.join("\n")}\n`;
}

// ── .dev.vars value escaping ─────────────────────────────────────────
//
// wrangler/miniflare read `.dev.vars` with dotenv semantics:
//   KEY=value            (unquoted; trimmed; value ends at EOL)
//   KEY="value"          (double-quoted; \n \r \t unescaped; \\ \")
//   KEY='value'          (single-quoted; no escapes; value as-is)
//
// Unquoted values cannot contain: newline, carriage return, tab, form-feed,
// vertical-tab, double or single quote, backslash, equals (some parsers split
// twice), hash (starts a comment on most parsers), dollar (variable
// interpolation on some), or leading/trailing whitespace (dotenv trims it).
// We allowlist a known-safe character class and quote otherwise. Double quotes
// let us escape whitespace that can't appear literally on a line, so we prefer
// them; internal `\` and `"` become `\\` / `\"`, and `\n` / `\r` / `\t` /
// `\f` / `\v` become two-char escapes.
//
// `\f` and `\v` are rare but real — encoding them means a value containing a
// form-feed or vertical-tab survives a round-trip through every dotenv-flavour
// parser we could plausibly meet, instead of relying on each one to handle a
// literal control character inside a quoted string.
//
// The empty string must also be quoted — bare `KEY=` is ambiguous (dotenv may
// parse it as null/undefined rather than empty-string).
const UNQUOTED_SAFE = /^[A-Za-z0-9_./:@+-]*$/;

export function escapeDevVarValue(value: string): string {
	if (value === "") return '""';
	// Reject leading/trailing whitespace unquoted — dotenv would trim it.
	if (UNQUOTED_SAFE.test(value) && value === value.trim()) return value;
	const escaped = value
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "\\r")
		.replace(/\t/g, "\\t")
		.replace(/\f/g, "\\f")
		.replace(/\v/g, "\\v");
	return `"${escaped}"`;
}
