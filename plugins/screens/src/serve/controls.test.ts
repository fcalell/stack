import assert from "node:assert/strict";
import { test } from "node:test";
import { fixtureControls, type ServeWorker } from "./controls.ts";

const app: ServeWorker = {
	async fetch(request: Request) {
		const { pathname } = new URL(request.url);
		return new Response(`app ${pathname}`);
	},
};
const env = {};
const ask = (worker: ServeWorker, path: string) =>
	worker.fetch(
		new Request(`http://localhost:1${path}`),
		env as never,
		undefined as never,
	);

test("a request passes through until a control rules on it", async () => {
	const worker = fixtureControls(app);
	assert.equal(
		await (await ask(worker, "/rpc/a/list")).text(),
		"app /rpc/a/list",
	);
	await ask(worker, "/fixture/fail?match=a/*&status=503");
	const failed = await ask(worker, "/rpc/a/list");
	assert.equal(failed.status, 503);
	assert.equal((await ask(worker, "/rpc/b/list")).status, 200);
	await ask(worker, "/fixture/fail?match=a/*&status=0");
	assert.equal((await ask(worker, "/rpc/a/list")).status, 200);
});

test("a delayed request waits, and the controls themselves never do", async () => {
	const worker = fixtureControls(app);
	await ask(worker, "/fixture/delay?match=/rpc&ms=80");
	const started = Date.now();
	await ask(worker, "/rpc/a/list");
	assert.ok(Date.now() - started >= 70);
	const control = Date.now();
	await ask(worker, "/fixture/delay?match=/rpc&ms=0");
	assert.ok(Date.now() - control < 70);
});

test("a control that is not given its arguments is refused", async () => {
	const worker = fixtureControls(app);
	assert.equal((await ask(worker, "/fixture/delay?match=x")).status, 400);
	assert.equal((await ask(worker, "/fixture/nope")).status, 404);
});

test("the app's own controls answer what the generic ones leave", async () => {
	const worker = fixtureControls(app, (request) =>
		new URL(request.url).pathname === "/fixture/clock"
			? new Response("noon")
			: undefined,
	);
	assert.equal(await (await ask(worker, "/fixture/clock")).text(), "noon");
	assert.equal((await ask(worker, "/fixture/other")).status, 404);
});

test("the app's controls are asked first, and a generic one answers when they pass", async () => {
	const worker = fixtureControls(app, async (request) =>
		new URL(request.url).pathname === "/fixture/link"
			? new Response("own link")
			: undefined,
	);
	assert.equal(await (await ask(worker, "/fixture/link")).text(), "own link");
	assert.match(
		await (await ask(worker, "/fixture/fail?match=a&status=500")).text(),
		/fail a 500/,
	);
});

test("a fixture control is asked before delay and fail", async () => {
	const order: string[] = [];
	const worker = fixtureControls(
		app,
		(request) => {
			order.push("first");
			return new URL(request.url).pathname === "/fixture/delay"
				? new Response("own delay")
				: undefined;
		},
		(request) => {
			order.push("second");
			return new URL(request.url).pathname === "/fixture/clock"
				? new Response("noon")
				: undefined;
		},
	);
	assert.equal(
		await (await ask(worker, "/fixture/delay?match=x&ms=5")).text(),
		"own delay",
	);
	assert.deepEqual(order, ["first"]);
	assert.equal(await (await ask(worker, "/fixture/clock")).text(), "noon");
	assert.equal(
		await (await ask(worker, "/fixture/fail?match=x&status=0")).text(),
		"fail x 0",
	);
});

test("/fixture/link with no control answers 404", async () => {
	const link = await ask(fixtureControls(app), "/fixture/link");
	assert.equal(link.status, 404);
	assert.match(await link.text(), /no plugin signs a fixture member in/);
});

test("a control reaches the app's own worker through context.app", async () => {
	const worker = fixtureControls(app, async (request, { app }) =>
		new URL(request.url).pathname === "/fixture/echo"
			? app(new Request("http://localhost:1/rpc/x"))
			: undefined,
	);
	assert.equal(await (await ask(worker, "/fixture/echo")).text(), "app /rpc/x");
});

test("the worker's job handlers survive the wrapper", async () => {
	const queue = async () => {};
	const scheduled = async () => {};
	const worker = fixtureControls({ ...app, queue, scheduled });
	assert.equal(worker.queue, queue);
	assert.equal(worker.scheduled, scheduled);
	assert.equal("queue" in fixtureControls(app), false);
});
