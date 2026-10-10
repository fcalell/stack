import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { createProcedure } from "../src/procedure.ts";
import * as wire from "../src/wire.ts";
import createWorker from "../src/worker/index.ts";

const procedure = createProcedure<Record<string, unknown>>();
const routes = {
	items: {
		list: procedure()
			.input(z.object({}).optional())
			.query(async () => []),
	},
};

const ORIGIN = "https://app.test";

function ask(origin?: string) {
	const worker = createWorker({ cors: [ORIGIN] }).handler(routes);
	return worker.fetch(
		new Request("http://stack.test/rpc/items/list", {
			headers: origin ? { origin } : {},
		}),
		{ STACK_QUIET: "1" },
		undefined,
	);
}

test("every STACK_*_HEADER the wire exports is exposed", () => {
	const headers = Object.entries(wire)
		.filter(([name]) => /^STACK_.*_HEADER$/.test(name))
		.map(([, value]) => value);
	assert.ok(headers.length >= 3);
	for (const header of headers) {
		assert.ok(
			(wire.STACK_EXPOSED_HEADERS as readonly unknown[]).includes(header),
			`${String(header)} is not in STACK_EXPOSED_HEADERS`,
		);
	}
});

test("a cross-origin answer exposes the entity and not-found headers", async () => {
	const response = await ask(ORIGIN);
	const exposed = (response.headers.get("access-control-expose-headers") ?? "")
		.split(",")
		.map((h) => h.trim().toLowerCase());
	for (const header of wire.STACK_EXPOSED_HEADERS) {
		assert.ok(exposed.includes(header), `${header} is exposed`);
	}
});

test("a same-origin answer carries no CORS headers", async () => {
	const response = await ask();
	assert.equal(response.headers.get("access-control-allow-origin"), null);
});
