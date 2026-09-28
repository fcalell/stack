import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "@fcalell/plugin-api/schema";
import type { RouteParams } from "../src/ui/router/params.ts";
import { parseSearch, type SearchOutput } from "../src/ui/router/search.ts";

const focus = z.object({
	journey: z.string().optional(),
	zoom: z.coerce.number().min(1).default(1),
});

test("search params parse through the page's schema", () => {
	assert.deepEqual(parseSearch(focus, { journey: "checkout", zoom: "2" }), {
		journey: "checkout",
		zoom: 2,
	});
});

test("a rejected value is dropped and the rest still parse", () => {
	assert.deepEqual(parseSearch(focus, { journey: "checkout", zoom: "0" }), {
		journey: "checkout",
		zoom: 1,
	});
});

test("a schema with a required key refuses a URL without it", () => {
	const strict = z.object({ id: z.string() });
	assert.throws(() => parseSearch(strict, {}), /required key/);
});

test("the params and search types follow the builder and the schema", () => {
	type Equal<A, B> =
		(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
			? true
			: false;
	const params: Equal<
		RouteParams<(params: { org: string | number }) => string>,
		{ org: string }
	> = true;
	const none: Equal<RouteParams<() => string>, Record<never, never>> = true;
	const search: Equal<
		SearchOutput<typeof focus>,
		{ journey?: string | undefined; zoom: number }
	> = true;
	assert.deepEqual([params, none, search], [true, true, true]);
});
