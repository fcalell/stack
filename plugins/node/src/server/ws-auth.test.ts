import assert from "node:assert/strict";
import { test } from "node:test";
import createWorker from "@fcalell/plugin-api/runtime";
import { WebSocket } from "ws";
import { z } from "zod";
import { defineChannel } from "../ws/index.ts";
import { createNodeServer, type NodeWorker } from "./create-node-server.ts";
import { defineService } from "./service.ts";
import { hasAuth, wsUpgradeDecision } from "./ws-guard.ts";

const APP = "https://app.example.com";
const DEV = "http://localhost:5173";
const SESSION = { user: { id: "u1" }, session: { id: "s1" } };

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
	assert.deepEqual(
		wsUpgradeDecision({
			origin: null,
			originAllowed: true,
			authConfigured: true,
			session: null,
		}),
		{ allow: false, reason: "session" },
	);
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
			origin: null,
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
// origins under STACK_DEV); only auth is a stand-in answering the one
// call the guard makes.
function worker(): NodeWorker {
	return createWorker({ cors: [APP], devCors: [DEV] })
		.use({
			name: "auth",
			context: () => ({}),
			fetch(request) {
				const url = new URL(request.url);
				if (url.pathname !== "/api/auth/get-session") return null;
				const signedIn = request.headers.get("cookie")?.includes("sid=valid");
				return Response.json(signedIn ? SESSION : null);
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
	const server = createNodeServer({
		port: 0,
		host: "127.0.0.1",
		worker: worker(),
		workerPaths: options.auth ? ["/rpc", "/api/auth"] : ["/rpc"],
		staticRoot: null,
		env: options.env ?? {},
		log: {
			info(message) {
				const match = /listening on http:\/\/[^:]+:(\d+)/.exec(message);
				if (match) port = Number(match[1]);
			},
			error() {},
		},
		services: [
			defineService({
				name: "room",
				start({ ws }) {
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
	return { port, stop: () => server.stop() };
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
