import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateEntry } from "../src/node/codegen.ts";

test("the entry carries the mount's own imports beside the shared ones, deduped", () => {
	const source = aggregateEntry({
		imports: [
			{ source: "./app.css", sideEffect: true },
			{ source: "virtual:stack-providers", default: "Providers" },
		],
		mount: {
			imports: [
				{ source: "@fcalell/plugin-solid-ui/app", named: ["createApp"] },
				{ source: "virtual:stack-providers", default: "Providers" },
				{ source: "../src/app/icons", default: "icons" },
			],
			expression:
				"createApp({ providers: (children) => <Providers>{children}</Providers>, icons })",
		},
	});
	assert.ok(source);
	assert.match(
		source,
		/import \{ createApp \} from "@fcalell\/plugin-solid-ui\/app";/,
	);
	assert.match(source, /import icons from "\.\.\/src\/app\/icons";/);
	assert.equal(source.match(/virtual:stack-providers/g)?.length, 1);
	assert.match(source, /createApp\(\{ providers: .*, icons \}\);\n$/);
});

test("no mount means no entry", () => {
	assert.equal(aggregateEntry({ imports: [], mount: null }), null);
});
