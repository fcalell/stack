import assert from "node:assert/strict";
import { test } from "node:test";
import { fixtureControls, type ServeWorker } from "./controls.ts";

const app: ServeWorker = {
	async fetch(request: Request) {
		const { pathname } = new URL(request.url);
		if (pathname === "/api/auth/email-otp/send-verification-otp")
			return Response.json({ success: true });
		if (pathname === "/api/auth/sign-in/email-otp")
			return new Response("{}", {
				headers: { "set-cookie": "session=abc; Path=/; HttpOnly" },
			});
		return new Response(`app ${pathname}`);
	},
};
const env = { STACK_SERVE_EMAIL: "f@example.com", STACK_SERVE_CODE: "000000" };
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

test("the link signs in as the fixture member and carries the cookie", async () => {
	const worker = fixtureControls(app);
	const link = await worker.fetch(
		new Request("http://localhost:1/fixture/link?to=/library"),
		env as never,
		undefined as never,
	);
	assert.equal(link.status, 302);
	assert.equal(link.headers.get("location"), "/library");
	assert.match(link.headers.getSetCookie()[0] ?? "", /^session=abc/);
	const bare = await worker.fetch(
		new Request("http://localhost:1/fixture/link"),
		{} as never,
		undefined as never,
	);
	assert.equal(bare.status, 404);
});
