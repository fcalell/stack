import {
	dedupeImports,
	type HtmlDocument,
	renderHtml,
	renderTsSourceFile,
	type TsExpression,
	type TsSourceFile,
} from "@fcalell/cli/ast";
import type { AppPlugin } from "@fcalell/plugin-vite";
import type {
	CodegenEntryPayload,
	CodegenHtmlPayload,
	CompositionProvidersPayload,
	RouterOptions,
} from "../types.ts";

// TanStack's router plugin call on a set of options, with the imports it
// needs: what `react.slots.routerPlugin` holds, and what a host that runs the
// plugin on options of its own renders.
export function routerPluginFor(options: RouterOptions): AppPlugin {
	return {
		imports: [
			{ source: "@tanstack/router-plugin/vite", named: ["tanstackRouter"] },
			{ source: "node:url", named: ["fileURLToPath"] },
		],
		call: {
			kind: "call",
			callee: { kind: "identifier", name: "tanstackRouter" },
			args: [
				{
					kind: "object",
					properties: [
						{ key: "target", value: { kind: "string", value: "react" } },
						{
							key: "autoCodeSplitting",
							value: { kind: "boolean", value: options.autoCodeSplitting },
						},
						{ key: "routesDirectory", value: options.routesDirectory },
						{ key: "generatedRouteTree", value: options.generatedRouteTree },
					],
				},
			],
		},
	};
}

// Render `.stack/entry.tsx`. Returns null when no plugin contributes a mount
// — plugin-react contributes the default via react.slots.mountExpression.
export function aggregateEntry(payload: CodegenEntryPayload): string | null {
	if (!payload.mount) return null;

	// The mount is fixed source, not an AST tree — render the imports through
	// the printer (for dedup + canonical ordering) and append it.
	const importsBlock = renderTsSourceFile({
		imports: dedupeImports([...payload.imports, ...payload.mount.imports]),
		statements: [],
	}).trimEnd();
	return `${importsBlock}\n\n${payload.mount.body}\n`;
}

// Emits `.stack/virtual-providers.tsx`. Providers arrive pre-sorted ascending
// by `order` (lower = outer) via the owning `react.slots.providers` list
// slot, whose stable sort keeps contribution order among equal orders; a
// second sort here would lose that tiebreak.
//
// Siblings render as additional children of the wrapper, after the wrapped
// subtree, so they share the wrapper's context. Returns null when no
// provider contributes — the Vite resolver then serves a pass-through stub.
export function aggregateProviders(
	payload: CompositionProvidersPayload,
): string | null {
	const sorted = payload.providers;
	if (sorted.length === 0) return null;

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

	const spec: TsSourceFile = {
		imports: dedupeImports([
			{ source: "react", named: ["ReactNode"], typeOnly: true },
			...sorted.flatMap((s) => s.imports),
		]),
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
										type: { kind: "reference", name: "ReactNode" },
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

	return renderTsSourceFile(spec);
}

// Renders `.stack/index.html` by loading the shell template and splicing
// head + bodyEnd injections. Returns null when no plugin claims a shell.
export async function aggregateHtml(
	payload: CodegenHtmlPayload,
): Promise<string | null> {
	if (!payload.shell) return null;

	const doc: HtmlDocument = {
		shellSource: payload.shell,
		head: payload.head,
		bodyEnd: payload.bodyEnd,
	};

	return renderHtml(doc);
}
