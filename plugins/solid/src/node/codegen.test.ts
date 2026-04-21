import type { ProviderSpec } from "@fcalell/cli/ast";
import { describe, expect, it } from "vitest";
import { aggregateEntry, aggregateHtml, aggregateProviders } from "./codegen";

describe("aggregateEntry", () => {
	it("returns null when no mount expression is contributed", () => {
		expect(aggregateEntry({ imports: [], mountExpression: null })).toBeNull();
	});

	it("renders imports and the mount statement", () => {
		const out = aggregateEntry({
			imports: [
				{ source: "solid-js/web", named: ["render"] },
				{ source: "./App", default: "App" },
			],
			mountExpression: {
				kind: "call",
				callee: { kind: "identifier", name: "render" },
				args: [
					{ kind: "identifier", name: "App" },
					{ kind: "identifier", name: "document.body" },
				],
			},
		});
		expect(out).not.toBeNull();
		if (!out) return;
		expect(out).toContain('import { render } from "solid-js/web"');
		expect(out).toContain('import App from "./App"');
		expect(out).toContain("render(App, document.body)");
	});
});

describe("aggregateProviders", () => {
	it("returns null when no providers are contributed", () => {
		expect(aggregateProviders({ providers: [] })).toBeNull();
	});

	it("renders a single wrapper with props.children inside", () => {
		const spec: ProviderSpec = {
			imports: [{ source: "@ui/theme", named: ["ThemeProvider"] }],
			wrap: { identifier: "ThemeProvider" },
			order: 100,
		};
		const out = aggregateProviders({ providers: [spec] });
		expect(out).not.toBeNull();
		if (!out) return;
		expect(out).toContain('import { ThemeProvider } from "@ui/theme"');
		expect(out).toContain("<ThemeProvider>");
		expect(out).toContain("{props.children}");
		expect(out).toContain("</ThemeProvider>");
	});

	it("nests wrappers outer-first by ascending order", () => {
		const outer: ProviderSpec = {
			imports: [{ source: "@ui/outer", named: ["OuterProvider"] }],
			wrap: { identifier: "OuterProvider" },
			order: 10,
		};
		const inner: ProviderSpec = {
			imports: [{ source: "@ui/inner", named: ["InnerProvider"] }],
			wrap: { identifier: "InnerProvider" },
			order: 20,
		};
		const out = aggregateProviders({ providers: [inner, outer] });
		expect(out).not.toBeNull();
		if (!out) return;
		expect(out).toMatch(
			/<OuterProvider>[\s\S]*<InnerProvider>[\s\S]*\{props\.children\}[\s\S]*<\/InnerProvider>[\s\S]*<\/OuterProvider>/,
		);
	});

	it("renders siblings alongside wrapped children inside the wrapper", () => {
		const spec: ProviderSpec = {
			imports: [
				{ source: "@ui/meta", named: ["MetaProvider"] },
				{ source: "@ui/toast", named: ["Toaster"] },
			],
			wrap: { identifier: "MetaProvider" },
			siblings: [{ kind: "jsx", tag: "Toaster", props: [], children: [] }],
			order: 100,
		};
		const out = aggregateProviders({ providers: [spec] });
		expect(out).not.toBeNull();
		if (!out) return;
		expect(out).toMatch(
			/<MetaProvider>[\s\S]*\{props\.children\}[\s\S]*<Toaster \/>[\s\S]*<\/MetaProvider>/,
		);
	});

	it("imports JSX type from solid-js", () => {
		const spec: ProviderSpec = {
			imports: [{ source: "@ui/x", named: ["X"] }],
			wrap: { identifier: "X" },
			order: 1,
		};
		const out = aggregateProviders({ providers: [spec] });
		expect(out).not.toBeNull();
		if (!out) return;
		expect(out).toContain('import type { JSX } from "solid-js"');
		expect(out).toContain("props: { children: JSX.Element }");
	});

	it("produces a default export named Providers as an arrow function", () => {
		const spec: ProviderSpec = {
			imports: [{ source: "@ui/x", named: ["X"] }],
			wrap: { identifier: "X" },
			order: 1,
		};
		const out = aggregateProviders({ providers: [spec] });
		expect(out).not.toBeNull();
		if (!out) return;
		expect(out).toContain("export default (props:");
	});
});

describe("aggregateHtml", () => {
	it("returns null when no shell URL is provided", async () => {
		expect(
			await aggregateHtml({ shell: null, head: [], bodyEnd: [] }),
		).toBeNull();
	});
});
