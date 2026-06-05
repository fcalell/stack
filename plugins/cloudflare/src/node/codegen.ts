import { log } from "@clack/prompts";
import {
	renderToml,
	type TomlDocument,
	type TomlValue,
} from "@fcalell/cli/ast";
import { parse as parseToml } from "smol-toml";
import type { CodegenWranglerPayload, WranglerBindingSpec } from "../types";

// ── Wrangler.toml merge contract ─────────────────────────────────────
//
// (1) FRAMEWORK_MANAGED_LISTS — consumer cannot specify; if present in the
//     consumer file we throw with an actionable message. The framework owns
//     these tables end-to-end (driven by plugin contributions to
//     cloudflare.slots.bindings / routes).
// (2) FRAMEWORK_DEFAULTED_SCALARS — consumer wins if present; otherwise the
//     framework supplies a default. (`name`, `compatibility_date`, `main`.)
// (3) Everything else is consumer-only and passes through verbatim
//     (e.g. `account_id`, `dev`, `build`, `assets`).
//
// `[vars]` is a hybrid: consumer keys pass through, framework keys (vars
// from contributions, secrets-as-empty, var-bindings) overlay; collisions
// across consumer/framework or across plugin contributions throw.

const FRAMEWORK_MANAGED_LISTS = new Set<string>([
	"d1_databases",
	"kv_namespaces",
	"r2_buckets",
	"unsafe", // [unsafe.bindings] — rate_limiter
	"routes",
]);

const GENERATED_MAIN_VALUES = new Set([
	"worker.ts",
	"./worker.ts",
	".stack/worker.ts",
	"./.stack/worker.ts",
]);

// YYYY-MM-DD — wrangler accepts only this exact form. Reject anything else
// at generate time so `wrangler types` doesn't fail later with a less obvious
// message.
const COMPATIBILITY_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

	if (!COMPATIBILITY_DATE_RE.test(opts.payload.compatibilityDate)) {
		throw new Error(
			`Invalid compatibility_date "${opts.payload.compatibilityDate}": must be YYYY-MM-DD.`,
		);
	}

	const consumerParsed = parseConsumerWrangler(opts.consumerWrangler);
	rejectFrameworkManagedSections(consumerParsed);

	const root: Record<string, TomlValue> = {};
	const arrayTables: Array<{
		path: string[];
		entries: Record<string, TomlValue>;
	}> = [];

	// (3) Consumer pass-through — copy every consumer key that isn't a
	// framework-managed list. Framework-defaulted scalars survive this step
	// (consumer wins) and are filled in by step (2) only when missing.
	for (const [k, v] of Object.entries(consumerParsed)) {
		if (FRAMEWORK_MANAGED_LISTS.has(k)) continue;
		// `vars` is special: consumer keys pass through here, framework keys
		// will overlay below with collision checks.
		root[k] = v;
	}

	// (2) Framework defaults — fill any framework-defaulted scalar the consumer
	// didn't set. The bug fix lives here: previously `compatibility_date` and
	// `name` were only populated when no consumer file existed at all.
	const fallbackName = sanitizeWranglerName(opts.name ?? "stack-app");
	if (root.name === undefined) {
		root.name = fallbackName;
	} else if (typeof root.name !== "string") {
		throw new Error(
			`Invalid wrangler.toml: \`name\` must be a string (got ${typeof root.name}).`,
		);
	}
	if (root.compatibility_date === undefined) {
		root.compatibility_date = opts.payload.compatibilityDate;
	} else if (typeof root.compatibility_date !== "string") {
		throw new Error(
			`Invalid wrangler.toml: \`compatibility_date\` must be a string (got ${typeof root.compatibility_date}).`,
		);
	} else if (!COMPATIBILITY_DATE_RE.test(root.compatibility_date)) {
		throw new Error(
			`Invalid wrangler.toml: \`compatibility_date\` must be YYYY-MM-DD (got "${root.compatibility_date}").`,
		);
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

	// (1) Framework-managed list overlay — push every binding/route the plugins
	// contributed. Consumer-side versions of these sections were rejected
	// upstream by `rejectFrameworkManagedSections`, so we own these arrays.
	appendBindingsToTables(opts.payload.bindings, arrayTables);

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

	// `[vars]` overlay — merge framework keys onto consumer keys, with cross-
	// stream collision detection (consumer-vars × framework-vars × secrets ×
	// var-bindings). Consumer vars survive only if they don't conflict.
	overlayVars(root, opts.payload);

	const doc: TomlDocument = { root, tables: [], arrayTables };
	const out = renderToml(doc);
	return out.endsWith("\n") ? out : `${out}\n`;
}

function parseConsumerWrangler(
	source: string | null,
): Record<string, TomlValue> {
	if (!source) return {};
	try {
		return parseToml(source) as Record<string, TomlValue>;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to parse consumer wrangler.toml: ${msg}`);
	}
}

function rejectFrameworkManagedSections(
	parsed: Record<string, TomlValue>,
): void {
	const offenders: string[] = [];
	for (const key of FRAMEWORK_MANAGED_LISTS) {
		if (parsed[key] !== undefined) {
			// `unsafe` is the parent of `[unsafe.bindings]`. Only flag it when the
			// nested `bindings` array is actually present — leaving room for other
			// `[unsafe.*]` sections wrangler may add later that we don't manage.
			if (key === "unsafe") {
				const u = parsed.unsafe;
				if (
					typeof u === "object" &&
					u !== null &&
					!Array.isArray(u) &&
					Array.isArray((u as Record<string, TomlValue>).bindings)
				) {
					offenders.push("unsafe.bindings");
				}
				continue;
			}
			offenders.push(key);
		}
	}
	if (offenders.length === 0) return;
	throw new Error(
		`wrangler.toml contains framework-managed section(s): ${offenders
			.map((s) => `[[${s}]]`)
			.join(
				", ",
			)}. Remove them and let plugins (db/auth/...) contribute these via stack.config.ts.`,
	);
}

function overlayVars(
	root: Record<string, TomlValue>,
	payload: CodegenWranglerPayload,
): void {
	const consumerVarsRaw = root.vars;
	const consumerVars: Record<string, TomlValue> =
		consumerVarsRaw &&
		typeof consumerVarsRaw === "object" &&
		!Array.isArray(consumerVarsRaw)
			? { ...(consumerVarsRaw as Record<string, TomlValue>) }
			: {};

	const frameworkVarBindings = payload.bindings.filter(
		(b): b is Extract<WranglerBindingSpec, { kind: "var" }> => b.kind === "var",
	);
	const frameworkExtraVars = payload.vars;
	const frameworkSecrets = payload.secrets;

	const hasFrameworkVars =
		frameworkVarBindings.length > 0 ||
		Object.keys(frameworkExtraVars).length > 0 ||
		frameworkSecrets.length > 0;

	if (!hasFrameworkVars && Object.keys(consumerVars).length === 0) {
		// Nothing to write; remove a trailing empty-vars artifact if any.
		if (consumerVarsRaw === undefined) return;
		root.vars = consumerVars;
		return;
	}

	// Detect collisions between consumer-supplied vars and framework keys.
	const collisions: Array<{
		key: string;
		consumer: string;
		framework: string;
	}> = [];
	const recordCollision = (key: string, framework: string) => {
		if (key in consumerVars) {
			collisions.push({ key, consumer: "consumer var", framework });
		}
	};
	for (const v of frameworkVarBindings) recordCollision(v.name, "var binding");
	for (const k of Object.keys(frameworkExtraVars))
		recordCollision(k, "extra var");
	for (const s of frameworkSecrets) recordCollision(s.name, "secret");
	if (collisions.length > 0) {
		const lines = collisions.map(
			(c) => `  - "${c.key}" (consumer wrangler.toml [vars] vs ${c.framework})`,
		);
		throw new Error(
			`wrangler.toml [vars] collisions — each key must come from one source:\n${lines.join(
				"\n",
			)}\nRemove the consumer-side entry or rename the contributor.`,
		);
	}

	const merged: Record<string, TomlValue> = { ...consumerVars };
	for (const [k, v] of Object.entries(frameworkExtraVars)) {
		merged[k] = v;
	}
	for (const v of frameworkVarBindings) {
		merged[v.name] = v.value;
	}
	for (const s of frameworkSecrets) {
		if (!(s.name in merged)) merged[s.name] = "";
	}
	root.vars = merged;
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
	bindings: WranglerBindingSpec[],
	arrayTables: Array<{ path: string[]; entries: Record<string, TomlValue> }>,
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
