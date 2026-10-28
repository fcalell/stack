import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createNodeServer, type NodeWorker } from "./create-node-server.ts";
import {
	boundHost,
	hostOf,
	listenerAdmits,
	listenerEnv,
	mainAdmits,
	originOf,
} from "./listeners.ts";

test("hostOf normalises a Host header for its scheme and refuses junk", () => {
	assert.equal(hostOf("Example.COM", "https:"), "example.com");
	assert.equal(hostOf("example.com:443", "https:"), "example.com");
	assert.equal(hostOf("example.com:443", "http:"), "example.com:443");
	assert.equal(hostOf("[::1]:8788", "http:"), "[::1]:8788");
	assert.equal(hostOf("evil.example/x", "http:"), null);
	assert.equal(hostOf("user@evil.example", "http:"), null);
	assert.equal(hostOf("", "http:"), null);
});

test("originOf takes an http(s) origin and nothing else", () => {
	assert.equal(originOf("https://stead.example/"), "https://stead.example");
	assert.equal(originOf("https://stead.example/a?b"), "https://stead.example");
	assert.equal(originOf("http://127.0.0.1:8788"), "http://127.0.0.1:8788");
	assert.equal(originOf("stead.example"), null);
	assert.equal(originOf("ftp://stead.example"), null);
	assert.equal(originOf(""), null);
	assert.equal(originOf(undefined), null);
});

test("the main listener admits its origins' hosts and its bound address", () => {
	const origins = ["https://example.com", "http://127.0.0.1:8788"];
	const bound = boundHost("127.0.0.1", 8788);
	const admits = (host: string | undefined, dev = false) =>
		mainAdmits({ host, origins, bound, dev });
	assert.equal(admits("example.com"), true);
	assert.equal(admits("example.com:443"), true);
	assert.equal(admits("127.0.0.1:8788"), true);
	assert.equal(admits("localhost:8788"), false);
	assert.equal(admits("127.0.0.1:9999"), false);
	assert.equal(admits("rebound.evil.example:8788"), false);
	assert.equal(admits(undefined), false);
	// Dev reaches a loopback name or an IP literal, never a foreign name.
	assert.equal(admits("localhost:5173", true), true);
	assert.equal(admits("app.localhost:5173", true), true);
	assert.equal(admits("192.168.1.20:8788", true), true);
	assert.equal(admits("[::1]:8788", true), true);
	assert.equal(admits("rebound.evil.example:8788", true), false);
	// No list (a server built by hand) or a wildcard admits every Host.
	assert.equal(
		mainAdmits({ host: "x", origins: undefined, bound, dev: false }),
		true,
	);
	assert.equal(
		mainAdmits({ host: "x", origins: ["*"], bound, dev: false }),
		true,
	);
});

test("a further listener admits its one origin's host, and nothing without one", () => {
	assert.equal(listenerAdmits("stead.example", "https://stead.example"), true);
	assert.equal(
		listenerAdmits("stead.example:443", "https://stead.example"),
		true,
	);
	assert.equal(
		listenerAdmits("127.0.0.1:8789", "https://stead.example"),
		false,
	);
	assert.equal(listenerAdmits("stead.example", null), false);
	assert.equal(listenerAdmits(undefined, "https://stead.example"), false);
});

test("a listener's env reads the server's env live under its own keys", () => {
	const base: Record<string, string | undefined> = { A: "1" };
	const env = listenerEnv(base, "network", "https://stead.example");
	assert.equal(env.A, "1");
	assert.equal(env.STACK_LISTENER, "network");
	assert.equal(env.STACK_ORIGIN, "https://stead.example");
	assert.equal("STACK_ORIGIN" in env, true);
	assert.equal(env.toString, Object.prototype.toString);
	base.B = "2";
	assert.equal(env.B, "2");
	assert.deepEqual(Object.keys(env).sort(), [
		"A",
		"B",
		"STACK_LISTENER",
		"STACK_ORIGIN",
	]);
	assert.deepEqual(
		{ ...env },
		{
			A: "1",
			B: "2",
			STACK_LISTENER: "network",
			STACK_ORIGIN: "https://stead.example",
		},
	);
});

// A worker that answers with what it was handed: the listener, its origin,
// and which env object (by first-seen order) the request carried.
function echoWorker(): NodeWorker {
	const seen = new WeakMap<object, number>();
	let next = 0;
	return {
		fetch(_request, env) {
			const e = env as Record<string, string | undefined>;
			let id = seen.get(e);
			if (id === undefined) {
				id = next++;
				seen.set(e, id);
			}
			return Response.json({
				listener: e.STACK_LISTENER ?? null,
				origin: e.STACK_ORIGIN ?? null,
				env: id,
			});
		},
	};
}

async function boot(env: Record<string, string | undefined>) {
	const ports: Record<string, number> = {};
	const staticRoot = mkdtempSync(join(tmpdir(), "stack-node-"));
	writeFileSync(join(staticRoot, "index.html"), "<p>app</p>");
	const server = createNodeServer({
		port: 0,
		host: "127.0.0.1",
		origins: ["http://127.0.0.1:8788", "https://example.com"],
		listeners: {
			network: { port: 0, host: "127.0.0.1", originVar: "NET_ORIGIN" },
		},
		worker: echoWorker(),
		workerPaths: ["/rpc"],
		staticRoot,
		env,
		log: {
			info(message) {
				const match =
					/stack node: (?:(\w+) )?listening on http:\/\/[^:]+:(\d+)/.exec(
						message,
					);
				if (match) ports[match[1] ?? "main"] = Number(match[2]);
			},
			error() {},
		},
	});
	await server.start();
	return {
		main: ports.main as number,
		network: ports.network as number,
		stop: () => server.stop(),
	};
}

function get(
	port: number,
	path: string,
	host?: string,
): Promise<{ status: number; body: string }> {
	return new Promise((resolve, reject) => {
		const req = request(
			{
				host: "127.0.0.1",
				port,
				path,
				headers: host === undefined ? {} : { host },
				setHost: host !== undefined,
			},
			(res) => {
				let body = "";
				res.setEncoding("utf8");
				res.on("data", (chunk) => {
					body += chunk;
				});
				res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
			},
		);
		req.on("error", reject);
		req.end();
	});
}

test("the main listener refuses a Host its origins do not name, on every path", async () => {
	const { main, stop } = await boot({});
	try {
		for (const path of ["/", "/board/1", "/rpc/x", "/ws"]) {
			assert.equal((await get(main, path, "evil.example")).status, 421);
			assert.equal((await get(main, path, `localhost:${main}`)).status, 421);
		}
		// Node itself refuses an HTTP/1.1 request without a Host.
		assert.equal((await get(main, "/rpc/x")).status, 400);
		assert.equal((await get(main, "/", "example.com")).status, 200);
		// The bound address itself.
		const own = await get(main, "/rpc/x", `127.0.0.1:${main}`);
		assert.equal(own.status, 200);
		assert.deepEqual(JSON.parse(own.body), {
			listener: null,
			origin: null,
			env: 0,
		});
	} finally {
		await stop();
	}
});

test("a further listener serves nothing until its origin is set, then its Host alone", async () => {
	const env: Record<string, string | undefined> = {};
	const { network, stop } = await boot(env);
	try {
		assert.equal((await get(network, "/rpc/x", "stead.example")).status, 421);
		env.NET_ORIGIN = "https://stead.example";
		assert.equal((await get(network, "/", "stead.example")).status, 200);
		assert.equal(
			(await get(network, "/rpc/x", `127.0.0.1:${network}`)).status,
			421,
		);
		assert.equal((await get(network, "/rpc/x", "example.com")).status, 421);
		const first = await get(network, "/rpc/x", "stead.example");
		const again = await get(network, "/rpc/x", "stead.example");
		assert.equal(first.status, 200);
		const firstBody = JSON.parse(first.body);
		assert.equal(firstBody.listener, "network");
		assert.equal(firstBody.origin, "https://stead.example");
		// One env per origin: the worker's per-env state is built once.
		assert.equal(JSON.parse(again.body).env, firstBody.env);

		// A changed origin moves the Host rule and the env with it.
		env.NET_ORIGIN = "https://home.example";
		assert.equal((await get(network, "/rpc/x", "stead.example")).status, 421);
		const moved = JSON.parse(
			(await get(network, "/rpc/x", "home.example")).body,
		);
		assert.equal(moved.origin, "https://home.example");
		assert.notEqual(moved.env, firstBody.env);
	} finally {
		await stop();
	}
});

test("the main listener under STACK_DEV admits a loopback name", async () => {
	const { main, stop } = await boot({ STACK_DEV: "1" });
	try {
		assert.equal((await get(main, "/", `localhost:${main}`)).status, 200);
		assert.equal((await get(main, "/", "evil.example")).status, 421);
	} finally {
		await stop();
	}
});
