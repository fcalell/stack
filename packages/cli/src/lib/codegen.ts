import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { log } from "@clack/prompts";
import { parse as parseToml } from "smol-toml";
import {
	type HtmlDocument,
	renderHtml,
	renderToml,
	renderTsSourceFile,
	type TomlDocument,
	type TomlValue,
	type TsExpression,
	type TsImportSpec,
	type TsSourceFile,
	type TsStatement,
} from "#ast";
import type {
	CodegenAppCssPayload,
	CodegenEntryPayload,
	CodegenEnvPayload,
	CodegenHtmlPayload,
	CodegenRoutesDtsPayload,
	CodegenViteConfigPayload,
	CodegenWorkerPayload,
	CodegenWranglerPayload,
	CompositionMiddlewarePayload,
	CompositionProvidersPayload,
	WranglerBindingSpec,
} from "#events";

// Values that mean "the generated entry" — written either relative to the
// consumer's repo root (".stack/worker.ts") or relative to the emitted
// .stack/wrangler.toml ("worker.ts"). Either is treated as intent to use
// the generated worker and will not trigger a custom-main warning.
const GENERATED_MAIN_VALUES = new Set([
	"worker.ts",
	"./worker.ts",
	".stack/worker.ts",
	"./.stack/worker.ts",
]);

// ── aggregateWorker ─────────────────────────────────────────────────

export function aggregateWorker(payload: CodegenWorkerPayload): string {
	const statements: TsStatement[] = [];

	if (payload.base) {
		// Build: const worker = <base>.use(<m1>).use(<m2>)...handler(<handler>);
		let chain: TsExpression = payload.base;
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
		imports: payload.imports,
		statements,
	};

	const rendered = renderTsSourceFile(spec);
	return rendered.endsWith("\n") ? rendered : `${rendered}\n`;
}

// ── aggregateWrangler ───────────────────────────────────────────────

export function aggregateWrangler(opts: {
	consumerWrangler: string | null;
	payload: CodegenWranglerPayload;
	name?: string;
}): string {
	// Build a base table from the consumer wrangler (if any), else default.
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
		// Preserve every existing key. Handle `main` specially.
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
		root.name = opts.name ?? "stack-app";
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
	// ── d1 ────────────────────────────────────────────────────────
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

	// ── kv ────────────────────────────────────────────────────────
	for (const b of bindings) {
		if (b.kind !== "kv") continue;
		arrayTables.push({
			path: ["kv_namespaces"],
			entries: { binding: b.binding, id: b.id },
		});
	}

	// ── r2 ────────────────────────────────────────────────────────
	for (const b of bindings) {
		if (b.kind !== "r2") continue;
		arrayTables.push({
			path: ["r2_buckets"],
			entries: { binding: b.binding, bucket_name: b.bucketName },
		});
	}

	// ── rate_limiter ──────────────────────────────────────────────
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

	// ── vars + secrets ────────────────────────────────────────────
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
		// Secrets default to empty string in wrangler.toml (dev defaults belong
		// to .dev.vars, not wrangler.toml). We still list them in [vars] so
		// wrangler's Env typing includes them.
		for (const s of secrets) {
			if (!(s.name in vars)) {
				vars[s.name] = "";
			}
		}
		// Merge onto any existing vars from the consumer wrangler.
		const existing = root.vars;
		if (existing && typeof existing === "object" && !Array.isArray(existing)) {
			root.vars = { ...(existing as Record<string, TomlValue>), ...vars };
		} else {
			root.vars = vars;
		}
	}
}

// ── aggregateEnvDts ─────────────────────────────────────────────────

export function aggregateEnvDts(payload: CodegenEnvPayload): string {
	// Deduplicate imports by source. Named lists are merged, typeOnly preserved
	// when consistent; a conflict (some typeOnly, some not) de-opts to non-type.
	const imports = dedupeImports(
		payload.fields.filter((f) => f.from).map((f) => f.from as TsImportSpec),
	);

	const members = payload.fields.map((f) => ({
		name: f.name,
		type: f.type,
	}));

	const spec: TsSourceFile = {
		imports,
		statements: [
			{
				kind: "interface",
				name: "Env",
				members,
			},
		],
	};

	const rendered = renderTsSourceFile(spec);
	return rendered.endsWith("\n") ? rendered : `${rendered}\n`;
}

function dedupeImports(specs: TsImportSpec[]): TsImportSpec[] {
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
		// named
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
	// If any source asks for non-type-only, de-opt to non-type-only.
	return current && inc;
}

// ── aggregateViteConfig ─────────────────────────────────────────────

export function aggregateViteConfig(payload: CodegenViteConfigPayload): string {
	const imports: TsImportSpec[] = [
		{ source: "node:url", named: ["fileURLToPath"] },
		{ source: "vite", named: ["defineConfig"] },
		...payload.imports,
	];

	// Root resolves to the .stack/ directory at config-eval time: Vite reads
	// `index.html` from there. `publicDir` is one level up so a consumer-owned
	// `public/` sibling of stack.config.ts gets copied. `build.outDir` lands
	// one level up too, beside the consumer's repo root, under `dist/client`.
	const configProps: Array<{
		key: string;
		value: TsExpression;
		shorthand?: boolean;
	}> = [
		{
			key: "root",
			value: {
				kind: "call",
				callee: { kind: "identifier", name: "fileURLToPath" },
				args: [
					{
						kind: "new",
						callee: { kind: "identifier", name: "URL" },
						args: [
							{ kind: "string", value: "." },
							{
								kind: "member",
								object: { kind: "identifier", name: "import.meta" },
								property: "url",
							},
						],
					},
				],
			},
		},
		{ key: "publicDir", value: { kind: "string", value: "../public" } },
		{
			key: "build",
			value: {
				kind: "object",
				properties: [
					{ key: "outDir", value: { kind: "string", value: "../dist/client" } },
					{ key: "emptyOutDir", value: { kind: "boolean", value: true } },
				],
			},
		},
		{
			key: "plugins",
			value: { kind: "array", items: payload.pluginCalls },
		},
	];

	if (payload.devServerPort > 0) {
		configProps.push({
			key: "server",
			value: {
				kind: "object",
				properties: [
					{
						key: "port",
						value: { kind: "number", value: payload.devServerPort },
					},
				],
			},
		});
	}

	if (payload.resolveAliases.length > 0) {
		configProps.push({
			key: "resolve",
			value: {
				kind: "object",
				properties: [
					{
						key: "alias",
						value: {
							kind: "object",
							properties: payload.resolveAliases.map((a) => ({
								key: a.find,
								value: { kind: "string", value: a.replacement },
							})),
						},
					},
				],
			},
		});
	}

	const spec: TsSourceFile = {
		imports,
		statements: [
			{
				kind: "export-default",
				value: {
					kind: "call",
					callee: { kind: "identifier", name: "defineConfig" },
					args: [{ kind: "object", properties: configProps }],
				},
			},
		],
	};

	const rendered = renderTsSourceFile(spec);
	return rendered.endsWith("\n") ? rendered : `${rendered}\n`;
}

// ── aggregateEntry ──────────────────────────────────────────────────

// Render `.stack/entry.tsx`. Plugins contribute CSS side-effect imports, any
// runtime identifiers needed by the mount expression, and the mount call
// itself (`mount(() => <App />, document.getElementById("app")!)`). If no
// plugin contributes a mount expression, the file is not emitted (return null).
export function aggregateEntry(payload: CodegenEntryPayload): string | null {
	if (!payload.mountExpression) return null;

	const spec: TsSourceFile = {
		imports: payload.imports,
		statements: [{ kind: "expression", value: payload.mountExpression }],
	};

	const rendered = renderTsSourceFile(spec);
	return rendered.endsWith("\n") ? rendered : `${rendered}\n`;
}

// ── aggregateProviders ──────────────────────────────────────────────

// Emits `.stack/virtual-providers.tsx`. Plugins contribute `ProviderSpec`s
// that describe a JSX wrapper (e.g. `<MetaProvider>`) and optional sibling
// elements (e.g. `<Toaster />`) rendered alongside the wrapped children —
// inside the wrapper — so siblings receive the provider's context.
// Returns null when no plugin contributes a provider — the Vite resolver
// then serves a pass-through stub at runtime.
//
// Ordering: providers are sorted ascending by `order` (lower = outer wrapper).
// Within a provider, siblings render after the wrapped subtree (they share
// the wrapper's context). Across providers, outer-order siblings render
// before inner-order siblings.
export function aggregateProviders(
	payload: CompositionProvidersPayload,
): string | null {
	if (payload.providers.length === 0) return null;

	const sorted = [...payload.providers].sort((a, b) => a.order - b.order);

	// Build nested JSX starting from the innermost expression (`props.children`)
	// and wrapping outward so the lowest-order provider ends up outermost.
	// Each provider can contribute siblings that render alongside the wrapped
	// subtree *inside* its own wrapper — those siblings share the wrapper's
	// context at runtime.
	let inner: TsExpression = {
		kind: "member",
		object: { kind: "identifier", name: "props" },
		property: "children",
	};
	for (let i = sorted.length - 1; i >= 0; i--) {
		const spec = sorted[i];
		if (!spec) continue;
		const children: TsExpression[] =
			spec.siblings && spec.siblings.length > 0
				? [inner, ...spec.siblings]
				: [inner];
		inner = {
			kind: "jsx",
			tag: spec.wrap.identifier,
			props: (spec.wrap.props ?? []).map((p) => ({
				name: p.name,
				value: p.value,
			})),
			children,
		};
	}

	const imports = dedupeImports([
		{ source: "solid-js", named: ["JSX"], typeOnly: true },
		...sorted.flatMap((s) => s.imports),
	]);

	const spec: TsSourceFile = {
		imports,
		statements: [
			{
				kind: "export-default",
				value: {
					kind: "arrow",
					params: [
						{
							name: "props",
							type: {
								kind: "object",
								members: [
									{
										name: "children",
										type: { kind: "reference", name: "JSX.Element" },
									},
								],
							},
						},
					],
					body: inner,
				},
			},
		],
	};

	const rendered = renderTsSourceFile(spec);
	return rendered.endsWith("\n") ? rendered : `${rendered}\n`;
}

// ── aggregateMiddleware ─────────────────────────────────────────────

const MIDDLEWARE_PHASE_ORDER: Record<
	CompositionMiddlewarePayload["entries"][number]["phase"],
	number
> = {
	"before-cors": 0,
	"after-cors": 1,
	"before-routes": 2,
	"after-routes": 3,
};

// Returns the ordered middleware call expressions plus the imports needed for
// them. Consumed by the worker pipeline: generate.ts emits Composition.Middleware
// first, then seeds Codegen.Worker's `imports` + `middlewareChain` with the
// result before emitting the Worker event.
//
// Ordering: primary key is `phase` (before-cors < after-cors < before-routes <
// after-routes); secondary key is `order` (ascending). Stable within ties.
export function aggregateMiddleware(
	payload: CompositionMiddlewarePayload,
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

// ── aggregateHtml ───────────────────────────────────────────────────

export async function aggregateHtml(
	payload: CodegenHtmlPayload,
): Promise<string | null> {
	if (!payload.shell) return null;

	const doc: HtmlDocument = {
		shellSource: payload.shell,
		head: payload.head,
		bodyEnd: payload.bodyEnd,
	};

	const out = await renderHtml(doc);
	return out.endsWith("\n") ? out : `${out}\n`;
}

// ── aggregateAppCss ─────────────────────────────────────────────────

// Emits `.stack/app.css` as a sequence of `@import` statements followed by
// `@layer` blocks. Returns null when no contributions exist so consumers
// don't see an empty file.
export function aggregateAppCss(payload: CodegenAppCssPayload): string | null {
	if (payload.imports.length === 0 && payload.layers.length === 0) {
		return null;
	}

	const lines: string[] = [];
	for (const imp of payload.imports) {
		lines.push(`@import ${JSON.stringify(imp)};`);
	}
	if (payload.imports.length > 0 && payload.layers.length > 0) {
		lines.push("");
	}
	for (const layer of payload.layers) {
		lines.push(`@layer ${layer.name} {`);
		lines.push(layer.content.trim());
		lines.push("}");
	}

	return `${lines.join("\n")}\n`;
}

// ── aggregateRoutesDts ──────────────────────────────────────────────

// Builds a minimal `.stack/routes.d.ts` declaration that augments
// `@fcalell/plugin-solid/routes` with a route-id union. The actual route set
// is discovered by plugin-solid's buildRoutesDts helper; this aggregator
// receives the final string from plugin-solid via Codegen.RoutesDts and is
// kept as a pass-through so the CLI owns the writer. Returns null when no
// routing plugin claimed a pagesDir.
export function aggregateRoutesDts(
	payload: CodegenRoutesDtsPayload,
	buildFn: (pagesDir: string) => Promise<string | null>,
): Promise<string | null> {
	if (!payload.pagesDir) return Promise.resolve(null);
	return buildFn(payload.pagesDir);
}

// ── aggregateDevVars ────────────────────────────────────────────────

export function aggregateDevVars(
	secrets: Array<{ name: string; devDefault: string }>,
): string | null {
	if (secrets.length === 0) return null;
	const lines = secrets.map((s) => `${s.name}=${s.devDefault}`);
	return `${lines.join("\n")}\n`;
}

// ── Runtime-export discovery ────────────────────────────────────────

export function hasRuntimeExport(packageName: string): boolean {
	const pkg = readPackageJson(packageName);
	return !!pkg?.exports?.["./runtime"];
}

function readPackageJson(
	packageName: string,
): { exports?: Record<string, unknown> } | null {
	for (const reqFn of [
		requireFromSelf,
		() => createRequire(join(process.cwd(), "package.json")),
	]) {
		try {
			const req = reqFn();
			const mainPath = req.resolve(packageName);
			return readJsonWalkingUp(mainPath);
		} catch {}
	}
	return null;
}

function requireFromSelf(): NodeJS.Require {
	return createRequire(import.meta.url);
}

function readJsonWalkingUp(
	startPath: string,
): { exports?: Record<string, unknown> } | null {
	let dir = join(startPath, "..");
	for (let i = 0; i < 10; i++) {
		const candidate = join(dir, "package.json");
		if (existsSync(candidate)) {
			return JSON.parse(readFileSync(candidate, "utf-8"));
		}
		const parent = join(dir, "..");
		if (parent === dir) return null;
		dir = parent;
	}
	return null;
}
