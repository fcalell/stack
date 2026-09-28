import assert from "node:assert/strict";
import { test } from "node:test";
import type { AuthClient } from "@fcalell/plugin-auth/client";
import { type SessionState, sessionGate } from "../src/ui/lib/session-gate.ts";

test("a session renders the layout", () => {
	assert.deepEqual(
		sessionGate({ data: { user: {} }, isPending: false }, "/login", "/a"),
		{ kind: "render" },
	);
});

test("the first answer still pending draws nothing yet", () => {
	assert.deepEqual(
		sessionGate({ data: null, isPending: true }, "/login", "/a"),
		{ kind: "wait" },
	);
});

test("no session sends the viewer to sign in with the address they asked for", () => {
	assert.deepEqual(
		sessionGate(
			{ data: null, isPending: false },
			"/login",
			"/acme/projects?tab=2",
		),
		{ kind: "signIn", href: "/login?redirect=%2Facme%2Fprojects%3Ftab%3D2" },
	);
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
