import assert from "node:assert/strict";
import { test } from "node:test";
import {
	fixtureControls,
	type ServeWorker,
} from "@fcalell/plugin-screens/serve";
import link from "./serve.ts";

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
const ask = (worker: ServeWorker, path: string, vars: object = env) =>
	worker.fetch(
		new Request(`http://localhost:1${path}`),
		vars as never,
		undefined as never,
	);

test("serve link signs the fixture member in", async () => {
	const worker = fixtureControls(app, link);
	const signed = await ask(worker, "/fixture/link?to=/library");
	assert.equal(signed.status, 302);
	assert.equal(signed.headers.get("location"), "/library");
	assert.match(signed.headers.getSetCookie()[0] ?? "", /^session=abc/);
	assert.equal(
		(await ask(worker, "/fixture/link?to=//evil.example")).headers.get(
			"location",
		),
		"/",
	);
	assert.equal((await ask(worker, "/fixture/link", {})).status, 404);
	assert.equal(await (await ask(worker, "/rpc/a")).text(), "app /rpc/a");
});
