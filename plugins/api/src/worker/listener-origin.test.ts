import assert from "node:assert/strict";
import { test } from "node:test";
import createWorker, { isForbiddenOrigin } from "./index.ts";

const APP = "https://app.example.com";
const NETWORK = "https://stead.example";

function preflight(
	worker: ReturnType<ReturnType<typeof createWorker>["handler"]>,
	origin: string,
	env: Record<string, string>,
) {
	return worker.fetch(
		new Request("http://127.0.0.1/rpc/x", {
			method: "OPTIONS",
			headers: { origin, "access-control-request-method": "POST" },
		}),
		env,
		undefined,
	);
}

test("the origin of the listener a request came in on is trusted on it", async () => {
	const worker = createWorker({ cors: [APP] }).handler();
	const own = await preflight(worker, NETWORK, { STACK_ORIGIN: NETWORK });
	assert.equal(own.headers.get("access-control-allow-origin"), NETWORK);
	const elsewhere = await preflight(worker, NETWORK, {});
	assert.equal(elsewhere.headers.get("access-control-allow-origin"), null);
	const listed = await preflight(worker, APP, { STACK_ORIGIN: NETWORK });
	assert.equal(listed.headers.get("access-control-allow-origin"), APP);
});

test("isForbiddenOrigin admits the listener's own origin", async () => {
	const verdicts: boolean[] = [];
	const worker = createWorker({ cors: [APP] })
		.useAfterContext(async (c, next) => {
			verdicts.push(isForbiddenOrigin(c));
			await next();
		})
		.handler();
	const post = (env: Record<string, string>) =>
		worker.fetch(
			new Request("http://127.0.0.1/rpc/x", {
				method: "POST",
				headers: { origin: NETWORK, "content-type": "application/json" },
				body: "{}",
			}),
			env,
			undefined,
		);
	await post({ STACK_ORIGIN: NETWORK });
	await post({});
	assert.deepEqual(verdicts, [false, true]);
});
