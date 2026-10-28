import assert from "node:assert/strict";
import { channel } from "node:diagnostics_channel";
import { test } from "node:test";
import createWorker from "@fcalell/plugin-api/runtime";
import { WebSocket } from "ws";
import { z } from "zod";
import { defineChannel } from "../ws/index.ts";
import { createNodeServer, type NodeWorker } from "./create-node-server.ts";
import { defineService } from "./service.ts";
import {
	hasAuth,
	SESSION_ENDED_CHANNEL,
	wsUpgradeDecision,
} from "./ws-guard.ts";
import type { WsHub } from "./ws-hub.ts";

const APP = "https://app.example.com";
const DEV = "http://localhost:5173";
const SESSION = { user: { id: "u1" }, session: { id: "s1" } };
const OTHER = { user: { id: "u1" }, session: { id: "s2" } };
const NETWORK = "https://stead.example";

test("wsUpgradeDecision refuses a foreign origin before looking at the session", () => {
	assert.deepEqual(
		wsUpgradeDecision({
			origin: "https://evil.example",
			originAllowed: false,
			authConfigured: true,
			session: SESSION,
		}),
		{ allow: false, reason: "origin" },
	);
	assert.deepEqual(
		wsUpgradeDecision({
			origin: "https://evil.example",
			originAllowed: false,
			authConfigured: false,
			session: null,
		}),
		{ allow: false, reason: "origin" },
	);
});

test("wsUpgradeDecision refuses no session when auth is configured", () => {
	assert.deepEqual(
		wsUpgradeDecision({
			origin: APP,
			originAllowed: true,
			authConfigured: true,
			session: null,
		}),
		{ allow: false, reason: "session" },
	);
});

test("wsUpgradeDecision refuses an upgrade with no Origin, session or not", () => {
	for (const authConfigured of [true, false]) {
		assert.deepEqual(
			wsUpgradeDecision({
				origin: null,
				originAllowed: true,
				authConfigured,
				session: SESSION,
			}),
			{ allow: false, reason: "origin" },
		);
	}
});

test("wsUpgradeDecision admits a trusted origin with a session, and anonymous without auth", () => {
	assert.deepEqual(
		wsUpgradeDecision({
			origin: APP,
			originAllowed: true,
			authConfigured: true,
			session: SESSION,
		}),
		{ allow: true, session: SESSION },
	);
	assert.deepEqual(
		wsUpgradeDecision({
			origin: APP,
			originAllowed: true,
			authConfigured: false,
			session: null,
		}),
		{ allow: true, session: null },
	);
});

test("hasAuth reads the auth prefix off the worker paths", () => {
	assert.equal(hasAuth(["/rpc", "/api/auth"]), true);
	assert.equal(hasAuth(["/rpc"]), false);
});

// The real api worker, so the origin list is its own (CORS plus the dev
// origins under STACK_DEV, plus a listener's own); only auth is a stand-in
// answering the one call the guard makes. It answers a session only when
// asked past the cookie cache, as the guard must ask, and `sid=other` holds
// a second session.
function worker(): NodeWorker {
	return createWorker({ cors: [APP], devCors: [DEV] })
		.use({
			name: "auth",
			context: () => ({}),
			fetch(request) {
				const url = new URL(request.url);
				if (url.pathname !== "/api/auth/get-session") return null;
				if (url.searchParams.get("disableCookieCache") !== "true") {
					return Response.json(null);
				}
				const cookie = request.headers.get("cookie") ?? "";
				if (cookie.includes("sid=valid")) return Response.json(SESSION);
				if (cookie.includes("sid=other")) return Response.json(OTHER);
				return Response.json(null);
			},
		})
		.handler();
}

const room = defineChannel("room", {
	server: { who: z.object({ user: z.string().nullable() }) },
	client: {},
});

async function boot(options: { auth: boolean; env?: Record<string, string> }) {
	let port = 0;
	let network = 0;
	let hub: WsHub | undefined;
	const server = createNodeServer({
		port: 0,
		host: "127.0.0.1",
		listeners: {
			network: { port: 0, host: "127.0.0.1", originVar: "NET_ORIGIN" },
		},
		worker: worker(),
		workerPaths: options.auth ? ["/rpc", "/api/auth"] : ["/rpc"],
		staticRoot: null,
		env: options.env ?? {},
		log: {
			info(message) {
				const match =
					/stack node: (network )?listening on http:\/\/[^:]+:(\d+)/.exec(
						message,
					);
				if (match?.[1]) network = Number(match[2]);
				else if (match) port = Number(match[2]);
			},
			error() {},
		},
		services: [
			defineService({
				name: "room",
				start({ ws }) {
					hub = ws;
					ws.channel(room, {
						onSubscribe(conn) {
							const user = conn.session?.user.id;
							conn.send("who", {
								user: typeof user === "string" ? user : null,
							});
						},
					});
				},
			}),
		],
	});
	await server.start();
	return {
		port,
		network,
		hub: hub as WsHub,
		stop: () => server.stop(),
	};
}

type Outcome =
	| { open: true; first: Promise<unknown> }
	| { open: false; status: number };

function connect(
	port: number,
	headers: Record<string, string>,
): Promise<Outcome> {
	return new Promise((resolve) => {
		const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`, { headers });
		socket.on("unexpected-response", (_request, response) => {
			resolve({ open: false, status: response.statusCode ?? 0 });
			socket.terminate();
		});
		socket.on("error", () => {});
		socket.on("open", () => {
			const first = new Promise<unknown>((done) => {
				socket.once("message", (data) => {
					done(JSON.parse(String(data)));
					socket.close();
				});
			});
			socket.send(JSON.stringify({ t: "sub", ch: "room" }));
			resolve({ open: true, first });
		});
	});
}

test("/ws refuses a foreign Origin even with a valid session", async () => {
	const { port, stop } = await boot({ auth: true });
	try {
		const outcome = await connect(port, {
			origin: "https://evil.example",
			cookie: "sid=valid",
		});
		assert.deepEqual(outcome, { open: false, status: 403 });
	} finally {
		await stop();
	}
});

test("/ws refuses a socket with no session when auth is configured", async () => {
	const { port, stop } = await boot({ auth: true });
	try {
		assert.deepEqual(await connect(port, { origin: APP }), {
			open: false,
			status: 403,
		});
		assert.deepEqual(await connect(port, {}), { open: false, status: 403 });
		assert.deepEqual(await connect(port, { origin: APP, cookie: "sid=old" }), {
			open: false,
			status: 403,
		});
	} finally {
		await stop();
	}
});

test("/ws admits a trusted Origin with a session and hands it to the channel", async () => {
	const { port, stop } = await boot({ auth: true });
	try {
		const outcome = await connect(port, { origin: APP, cookie: "sid=valid" });
		assert.equal(outcome.open, true);
		if (!outcome.open) return;
		assert.deepEqual(await outcome.first, {
			t: "msg",
			ch: "room",
			type: "who",
			payload: { user: "u1" },
		});
	} finally {
		await stop();
	}
});

test("/ws trusts the dev origins only under STACK_DEV", async () => {
	const prod = await boot({ auth: true });
	try {
		const outcome = await connect(prod.port, {
			origin: DEV,
			cookie: "sid=valid",
		});
		assert.deepEqual(outcome, { open: false, status: 403 });
	} finally {
		await prod.stop();
	}
	const dev = await boot({ auth: true, env: { STACK_DEV: "1" } });
	try {
		const outcome = await connect(dev.port, {
			origin: DEV,
			cookie: "sid=valid",
		});
		assert.equal(outcome.open, true);
		if (outcome.open) await outcome.first;
	} finally {
		await dev.stop();
	}
});

test("/ws without auth still refuses a foreign Origin and admits the rest anonymously", async () => {
	const { port, stop } = await boot({ auth: false });
	try {
		assert.deepEqual(await connect(port, { origin: "https://evil.example" }), {
			open: false,
			status: 403,
		});
		const outcome = await connect(port, { origin: APP });
		assert.equal(outcome.open, true);
		if (!outcome.open) return;
		assert.deepEqual(await outcome.first, {
			t: "msg",
			ch: "room",
			type: "who",
			payload: { user: null },
		});
	} finally {
		await stop();
	}
});

test("/ws refuses an upgrade with no Origin even with a valid session", async () => {
	for (const auth of [true, false]) {
		const { port, stop } = await boot({ auth });
		try {
			assert.deepEqual(await connect(port, { cookie: "sid=valid" }), {
				open: false,
				status: 403,
			});
		} finally {
			await stop();
		}
	}
});

test("/ws on a further listener admits its own origin alone, at its Host", async () => {
	const { network, stop } = await boot({
		auth: true,
		env: { NET_ORIGIN: NETWORK },
	});
	try {
		const host = "stead.example";
		const outcome = await connect(network, {
			host,
			origin: NETWORK,
			cookie: "sid=valid",
		});
		assert.equal(outcome.open, true);
		if (outcome.open) {
			assert.deepEqual(await outcome.first, {
				t: "msg",
				ch: "room",
				type: "who",
				payload: { user: "u1" },
			});
		}
		// An origin the main listener's CORS list trusts is no page of this one.
		assert.deepEqual(
			await connect(network, { host, origin: APP, cookie: "sid=valid" }),
			{ open: false, status: 403 },
		);
		assert.deepEqual(
			await connect(network, {
				host: `127.0.0.1:${network}`,
				origin: NETWORK,
				cookie: "sid=valid",
			}),
			{ open: false, status: 421 },
		);
	} finally {
		await stop();
	}
});

// A subscribed socket held open, and how it closed.
function hold(
	port: number,
	cookie: string,
): Promise<{ closed: Promise<{ code: number; reason: string }> }> {
	return new Promise((resolve, reject) => {
		const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
			headers: { origin: APP, cookie },
		});
		socket.on("error", reject);
		const closed = new Promise<{ code: number; reason: string }>((done) => {
			socket.on("close", (code, reason) =>
				done({ code, reason: String(reason) }),
			);
		});
		socket.on("open", () => {
			socket.once("message", () => resolve({ closed }));
			socket.send(JSON.stringify({ t: "sub", ch: "room" }));
		});
	});
}

function within<T>(promise: Promise<T>, ms: number): Promise<T | "open"> {
	return Promise.race([
		promise,
		new Promise<"open">((done) => setTimeout(() => done("open"), ms)),
	]);
}

test("closeSession closes that session's sockets and no other", async () => {
	const { port, hub, stop } = await boot({ auth: true });
	try {
		const ended = await hold(port, "sid=valid");
		const kept = await hold(port, "sid=other");
		hub.closeSession("s1");
		assert.deepEqual(await ended.closed, {
			code: 1008,
			reason: "session ended",
		});
		assert.equal(await within(kept.closed, 100), "open");
	} finally {
		await stop();
	}
});

test("a session auth ends closes its sockets by itself", async () => {
	const { port, stop } = await boot({ auth: true });
	try {
		const ended = await hold(port, "sid=valid");
		const kept = await hold(port, "sid=other");
		channel(SESSION_ENDED_CHANNEL).publish({ sessionId: "s1" });
		assert.equal((await ended.closed).code, 1008);
		assert.equal(await within(kept.closed, 100), "open");
	} finally {
		await stop();
	}
});
