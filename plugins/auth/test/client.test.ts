import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createAuthClient } from "../src/client.ts";

// The consumer's access control as its web client passes it.
const access = {
	statements: { project: ["read", "update"] },
	roles: {
		owner: { project: ["read", "update"] },
		editor: { project: ["read"] },
	},
} as const;

test("the configured access control builds the organization methods", () => {
	const client = createAuthClient({ organization: access });
	assert.equal(
		client.organization.checkRolePermission({
			role: "editor",
			permissions: { project: ["read"] },
		}),
		true,
	);
	assert.equal(
		client.organization.checkRolePermission({
			role: "editor",
			permissions: { project: ["update"] },
		}),
		false,
	);
});

test("the mcp client attaches the login page's signed query to its POSTs", async () => {
	// The provider's client plugin attaches the login page's signed query to
	// every POST it makes: the wire carries `oauth_query`.
	const sent: string[] = [];
	const original = globalThis.window;
	// biome-ignore lint/suspicious/noExplicitAny: a browser location stand-in.
	(globalThis as any).window = {
		location: {
			search: "?client_id=x&sig=y&ba_param=client_id&ba_param=ba_param",
		},
	};
	const fetchMock = mock.method(
		globalThis,
		"fetch",
		async (input: unknown, init?: RequestInit) => {
			sent.push(
				input instanceof Request
					? await input.clone().text()
					: String(init?.body),
			);
			return Response.json({});
		},
	);
	try {
		const withQuery = createAuthClient({
			mcp: true,
			baseURL: "http://localhost/api/auth",
		});
		await withQuery.oauth2.consent({ accept: true });
	} finally {
		fetchMock.mock.restore();
		// biome-ignore lint/suspicious/noExplicitAny: restoring the stand-in.
		(globalThis as any).window = original;
	}
	assert.equal(sent.length, 1);
	assert.match(sent[0] ?? "", /"oauth_query":"client_id=x&sig=y&ba_param=/);
});
