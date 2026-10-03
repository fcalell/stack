// Composed as `.stack/worker.ts` is generated: a default export and its
// router type, with an env check the test entry's env must pass.
import createWorker from "../../../src/worker/index.ts";
import * as routes from "./routes/index.ts";
import { SCOPE_ROW_ID } from "./routes/scoped.ts";

// The context plugin-auth would provide, stubbed so plugin-api's tests
// never import it: every caller is one signed-in user, and the scope
// resolves for `SCOPE_ROW_ID` only, with the caller as its owner.
const worker = createWorker({
	prefix: "/rpc",
	envChecks: [{ name: "FIXTURE_SECRET", minLength: 16 }],
})
	.use(() => ({
		auth: {
			api: {
				getSession: async () => ({
					user: { id: "user-1" },
					session: { id: "session-1" },
				}),
			},
		},
		tenancy: {
			resolve: async (_scope: unknown, id: string) =>
				id === SCOPE_ROW_ID ? { org: { id }, member: { role: "owner" } } : null,
			can: () => true,
		},
	}))
	.handler(routes);

export type AppRouter = typeof worker._router;
export default worker;
