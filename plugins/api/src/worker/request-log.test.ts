import assert from "node:assert/strict";
import { test } from "node:test";
import { Hono } from "hono";
import { formatRequestLog, pathnameOf, requestLogger } from "./request-log.ts";

test("pathnameOf drops the origin, the query string and the hash", () => {
	assert.equal(
		pathnameOf("http://x.test/rpc/users/get?data=%7B%7D"),
		"/rpc/users/get",
	);
	assert.equal(pathnameOf("https://x.test"), "/");
	assert.equal(pathnameOf("https://x.test?data=1"), "/");
	assert.equal(pathnameOf("/rpc/a#frag"), "/rpc/a");
});

test("formatRequestLog prints the request, then the response with its duration", () => {
	const url = "http://x.test/rpc/users/get?data=secret";
	assert.equal(
		formatRequestLog({ method: "GET", url }),
		"<-- GET /rpc/users/get",
	);
	assert.equal(
		formatRequestLog({ method: "GET", url, status: 200, ms: 12 }),
		"--> GET /rpc/users/get 200 12ms",
	);
	assert.equal(
		formatRequestLog({ method: "POST", url, status: 500, ms: 1234 }),
		"--> POST /rpc/users/get 500 1.2s",
	);
});

test("requestLogger never prints the query string", async () => {
	const lines: string[] = [];
	const app = new Hono();
	app.use(
		"*",
		requestLogger((line) => lines.push(line)),
	);
	app.get("/rpc/search", (c) => c.json({ ok: true }));
	const res = await app.request('/rpc/search?data={"email":"a@b.c"}');
	assert.equal(res.status, 200);
	assert.equal(lines.length, 2);
	assert.equal(lines[0], "<-- GET /rpc/search");
	assert.match(lines[1] ?? "", /^--> GET \/rpc\/search 200 \d+ms$/);
	assert.ok(lines.every((line) => !line.includes("a@b.c")));
});
