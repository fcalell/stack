// Composed as `.stack/worker.ts` is generated: a default export and its
// router type, with an env check the test entry's env must pass.
import createWorker from "../../../src/worker/index.ts";
import { CHALLENGE } from "./challenge.ts";
import mcp from "./mcp.ts";
import type { FixtureEnv } from "./procedure.ts";
import * as routes from "./routes/index.ts";
import { SCOPE_ROW_ID } from "./routes/scoped.ts";

// The bearer the stub OAuth provider accepts.
const GOOD_TOKEN = "good";

const tenancy = {
	resolve: async (_scope: unknown, id: string) =>
		id === SCOPE_ROW_ID ? { org: { id }, member: { role: "owner" } } : null,
	can: () => true,
};

// The context plugin-auth would provide, stubbed so plugin-api's tests
// never import it. A cookie signs in `cookie-user`, no cookie `user-1`;
// the bearer `good` verifies as the agent `agent-user` in `org-1`; the
// scope resolves for `SCOPE_ROW_ID` only, with the caller as its owner.
const worker = createWorker<FixtureEnv>({
	prefix: "/rpc",
	envChecks: [{ name: "FIXTURE_SECRET", minLength: 16 }],
})
	.use(() => ({
		auth: {
			api: {
				getSession: async ({ headers }: { headers: Headers }) =>
					headers.get("cookie")
						? {
								user: { id: "cookie-user" },
								session: { id: "cookie-session" },
							}
						: { user: { id: "user-1" }, session: { id: "session-1" } },
			},
		},
		tenancy,
		oauth: {
			verify: async (request: Request) => {
				if (request.headers.get("authorization") !== `Bearer ${GOOD_TOKEN}`) {
					return new Response(JSON.stringify({ error: "unauthorized" }), {
						status: 401,
						headers: { "www-authenticate": CHALLENGE },
					});
				}
				return {
					user: { id: "agent-user", agent: true },
					session: {
						id: "grant-1",
						expiresAt: new Date(Date.now() + 60 * 60 * 1000),
					},
					member: { role: "owner" },
					grant: {
						id: "grant-1",
						clientId: "client-1",
						organizationId: SCOPE_ROW_ID,
						scopes: ["mcp"],
					},
					tenancy,
				};
			},
		},
	}))
	.handler(routes, { mcp, name: "fixture" });

export type AppRouter = typeof worker._router;
export default worker;
