import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateEntry, aggregateProviders } from "../src/node/codegen.ts";

test("the entry carries the mount's own imports beside the shared ones, deduped", () => {
	const source = aggregateEntry({
		imports: [
			{ source: "./app.css", sideEffect: true },
			{ source: "virtual:stack-providers", default: "Providers" },
		],
		mount: {
			imports: [
				{ source: "react-dom/client", named: ["createRoot"] },
				{ source: "virtual:stack-providers", default: "Providers" },
			],
			body: 'createRoot(document.getElementById("app") as HTMLElement).render(<Providers />);',
		},
	});
	assert.ok(source);
	assert.match(source, /import \{ createRoot \} from "react-dom\/client";/);
	assert.match(source, /import "\.\/app\.css";/);
	assert.equal(source.match(/virtual:stack-providers/g)?.length, 1);
	assert.match(source, /\.render\(<Providers \/>\);\n$/);
});

test("no mount means no entry", () => {
	assert.equal(aggregateEntry({ imports: [], mount: null }), null);
});

test("providers nest by order, siblings after the wrapped subtree, typed by React", () => {
	const source = aggregateProviders({
		providers: [
			{
				imports: [{ source: "outer", named: ["Outer"] }],
				wrap: { identifier: "Outer" },
				order: 0,
			},
			{
				imports: [{ source: "inner", named: ["Inner", "Toaster"] }],
				wrap: { identifier: "Inner" },
				siblings: [{ kind: "jsx", tag: "Toaster", props: [], children: [] }],
				order: 1,
			},
		],
	});
	assert.ok(source);
	assert.match(source, /import type \{ ReactNode \} from "react";/);
	assert.match(source, /props: \{ children: ReactNode \}/);
	assert.match(
		source,
		/<Outer><Inner>\{props\.children\}<Toaster( \/>|><\/Toaster>)<\/Inner><\/Outer>/,
	);
});

test("no providers means the Vite stub serves the module", () => {
	assert.equal(aggregateProviders({ providers: [] }), null);
});
