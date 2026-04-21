import {
	dedupeImports,
	type HtmlDocument,
	renderHtml,
	renderTsSourceFile,
	type TsExpression,
	type TsSourceFile,
} from "@fcalell/cli/ast";
import type {
	CodegenEntryPayload,
	CodegenHtmlPayload,
	CompositionProvidersPayload,
} from "../types";

// Render `.stack/entry.tsx`. Returns null when no plugin contributes a mount
// expression — `plugin-solid` seeds it via solid.events.Entry.
export function aggregateEntry(payload: CodegenEntryPayload): string | null {
	if (!payload.mountExpression) return null;

	const spec: TsSourceFile = {
		imports: payload.imports,
		statements: [{ kind: "expression", value: payload.mountExpression }],
	};

	const rendered = renderTsSourceFile(spec);
	return rendered.endsWith("\n") ? rendered : `${rendered}\n`;
}

// Emits `.stack/virtual-providers.tsx`. Providers are sorted ascending by
// `order` (lower = outer). Siblings render alongside the wrapped subtree,
// inside the wrapper, so they share its context. Returns null when no
// provider contributes — the Vite resolver then serves a pass-through stub.
export function aggregateProviders(
	payload: CompositionProvidersPayload,
): string | null {
	if (payload.providers.length === 0) return null;

	const sorted = [...payload.providers].sort((a, b) => a.order - b.order);

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

	const out = await renderHtml(doc);
	return out.endsWith("\n") ? out : `${out}\n`;
}
