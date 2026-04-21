import { log } from "@clack/prompts";
import {
	renderToml,
	type TomlDocument,
	type TomlValue,
} from "@fcalell/cli/ast";
import { parse as parseToml } from "smol-toml";
import type { CodegenWranglerPayload, WranglerBindingSpec } from "../types";

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
		const date =
			opts.payload.compatibilityDate ||
			new Date().toISOString().split("T")[0] ||
			"";
		root.name = sanitizeWranglerName(opts.name ?? "stack-app");
		root.compatibility_date = date;
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
		};
		if (b.databaseName) entry.database_name = b.databaseName;
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
		arrayTables.push({
			path: ["unsafe", "bindings"],
			entries: {
				name: b.binding,
				type: "ratelimit",
				limit: b.simple.limit,
				period: b.simple.period,
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
	const lines = secrets.map((s) => `${s.name}=${s.devDefault}`);
	return `${lines.join("\n")}\n`;
}
