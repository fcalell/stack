import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError } from "@fcalell/plugin-api/error";
import type { AuthClient } from "@fcalell/plugin-auth/client";
import { QueryClient } from "@tanstack/solid-query";
import {
	claimCache,
	isUnauthorized,
	nextViewer,
	type SessionState,
	sessionGate,
	settleRefusal,
	viewerOf,
} from "../src/ui/lib/session-gate.ts";

const refetch = () => {};
const answer = (state: Partial<SessionState>): SessionState => ({
	data: null,
	isPending: false,
	error: null,
	refetch,
	...state,
});

test("a session renders the layout", () => {
	assert.deepEqual(
		sessionGate(answer({ data: { session: {}, user: {} } }), "/login", "/a"),
		{ kind: "render" },
	);
});

test("the first answer still pending draws nothing yet", () => {
	assert.deepEqual(sessionGate(answer({ isPending: true }), "/login", "/a"), {
		kind: "wait",
	});
});

test("no session sends the viewer to sign in with the address they asked for", () => {
	assert.deepEqual(sessionGate(answer({}), "/login", "/acme/projects?tab=2"), {
		kind: "signIn",
		href: "/login?redirect=%2Facme%2Fprojects%3Ftab%3D2",
	});
});

test("a 401 is no session: the viewer signs in", () => {
	assert.deepEqual(
		sessionGate(answer({ error: { status: 401 } }), "/login", "/a"),
		{ kind: "signIn", href: "/login?redirect=%2Fa" },
	);
});

test("a check that failed is a failure, never a sign-in", () => {
	for (const status of [0, 500, 502, 404]) {
		assert.deepEqual(
			sessionGate(answer({ error: { status } }), "/login", "/a"),
			{ kind: "failed" },
			`status ${status}`,
		);
	}
});

test("a body that is no session never renders the layout", () => {
	for (const data of [{}, { user: {} }, "<!doctype html>", true, 1]) {
		assert.deepEqual(
			sessionGate(answer({ data }), "/login", "/a"),
			{ kind: "failed" },
			JSON.stringify(data),
		);
	}
});

test("the generated client's session accessor fits SessionBoundary", () => {
	type Session = ReturnType<
		ReturnType<
			AuthClient<{
				passkey: false;
				emailOtp: true;
				organization: true;
			}>["useSession"]
		>
	>;
	const fits: Session extends SessionState ? true : false = true;
	assert.equal(fits, true);
});

test("a 401 from the api is the session's, a 403 or a 404 is not", () => {
	assert.equal(isUnauthorized(new ApiError("UNAUTHORIZED")), true);
	assert.equal(isUnauthorized({ status: 401 }), true);
	assert.equal(isUnauthorized(new ApiError("FORBIDDEN")), false);
	assert.equal(isUnauthorized(new ApiError("NOT_FOUND")), false);
	assert.equal(isUnauthorized(new Error("boom")), false);
});

// The session a signed-out viewer's layout still holds until it is re-asked.
function stale(after: SessionState): () => SessionState {
	let state = answer({ data: { session: {}, user: {} } });
	return () => ({
		...state,
		refetch: async () => {
			state = after;
		},
	});
}

test("a 401 after a sign-out re-asks the session and the gate sends to sign in", async () => {
	const session = stale(answer({ data: null }));
	assert.equal(
		await settleRefusal(new ApiError("UNAUTHORIZED"), session),
		"signIn",
	);
	assert.equal(sessionGate(session(), "/login", "/acme").kind, "signIn");
});

test("a 401 while the session still stands goes on to the app's error boundary", async () => {
	const session = stale(answer({ data: { session: {}, user: {} } }));
	assert.equal(
		await settleRefusal(new ApiError("UNAUTHORIZED"), session),
		"rethrow",
	);
});

test("an error that is no 401 goes on without re-asking the session", async () => {
	let asked = false;
	const session = () =>
		answer({
			data: { session: {}, user: {} },
			refetch: () => {
				asked = true;
			},
		});
	assert.equal(
		await settleRefusal(new ApiError("FORBIDDEN"), session),
		"rethrow",
	);
	assert.equal(asked, false);
});

test("the viewer is the session's user id, and no session has none", () => {
	assert.equal(viewerOf({ session: {}, user: { id: "u1" } }), "u1");
	assert.equal(viewerOf({ session: {}, user: {} }), null);
	assert.equal(viewerOf(null), null);
});

test("a sign-out signs the held viewer out; a pending or failed check keeps them", () => {
	const signedIn = answer({ data: { session: {}, user: { id: "u1" } } });
	assert.deepEqual(nextViewer(null, signedIn), {
		viewer: "u1",
		signedOut: null,
	});
	assert.deepEqual(nextViewer("u1", answer({ isPending: true })), {
		viewer: "u1",
		signedOut: null,
	});
	assert.deepEqual(nextViewer("u1", answer({ error: { status: 500 } })), {
		viewer: "u1",
		signedOut: null,
	});
	assert.deepEqual(nextViewer("u1", answer({})), {
		viewer: null,
		signedOut: "u1",
	});
	assert.deepEqual(nextViewer("u1", answer({ error: { status: 401 } })), {
		viewer: null,
		signedOut: "u1",
	});
	assert.deepEqual(nextViewer(null, answer({})), {
		viewer: null,
		signedOut: null,
	});
});

test("another user's session replaces the held viewer, who is signed out", () => {
	const other = answer({ data: { session: {}, user: { id: "u2" } } });
	assert.deepEqual(nextViewer("u1", other), { viewer: "u2", signedOut: "u1" });
});

test("the query cache is emptied for a viewer other than the one it was read for", () => {
	const client = new QueryClient();
	const rules = ["rules", "org-1"];
	claimCache(client, "owner");
	client.setQueryData(rules, ["manage all"]);
	claimCache(client, "owner");
	assert.deepEqual(client.getQueryData(rules), ["manage all"]);

	claimCache(client, "viewer");
	assert.equal(client.getQueryData(rules), undefined);
	assert.equal(client.getQueryCache().getAll().length, 0);

	client.setQueryData(rules, ["read all"]);
	claimCache(client, "viewer");
	assert.deepEqual(client.getQueryData(rules), ["read all"]);
});

test("the first viewer keeps what the client cached before any session", () => {
	const client = new QueryClient();
	client.setQueryData(["invitation", "i1"], { organization: "Acme" });
	claimCache(client, "u1");
	assert.deepEqual(client.getQueryData(["invitation", "i1"]), {
		organization: "Acme",
	});
});
