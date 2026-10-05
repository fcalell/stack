// Composed as `.stack/worker.ts` is generated for a sqlite consumer with
// organizations and `mcp` on: one probe that verifies the bearer token it
// carries, as an MCP endpoint would.
import { createProcedure } from "@fcalell/plugin-api/procedure";
import createWorker, { type AppBuilder } from "@fcalell/plugin-api/runtime";
import dbRuntime from "@fcalell/plugin-db/runtime/sqlite";
import { ORPCError } from "@orpc/server";
import * as authSchema from "../../../src/schema/index.ts";
import * as oauthSchema from "../../../src/schema/oauth.ts";
import * as organizationSchema from "../../../src/schema/organization.ts";
import authRuntime from "../../../src/worker/index.ts";

const chain = createWorker({ prefix: "/rpc" })
	.use(
		dbRuntime({
			fileVar: "DB_FILE",
			schema: { ...authSchema, ...organizationSchema, ...oauthSchema },
		}),
	)
	.use(
		authRuntime({
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
			trustedOrigins: ["http://localhost"],
			emailOtp: false,
			cookies: { prefix: "probe" },
			organization: true,
			mcp: true,
		}),
	);
type Context = typeof chain extends AppBuilder<infer C> ? C : never;
const procedure = createProcedure<Context, Record<string, never>, string>();

const worker = chain.handler({
	probe: {
		whoami: procedure({}).query(async ({ context }) => {
			const verified = await context.oauth.verify(
				new Request("http://localhost/mcp", { headers: context.reqHeaders }),
			);
			if (verified instanceof Response) throw new ORPCError("UNAUTHORIZED");
			return {
				userId: verified.user.id,
				agent: verified.user.agent,
				organizationId: verified.grant.organizationId,
				role: verified.member.role,
			};
		}),
	},
});

export type AppRouter = typeof worker._router;
export default worker;
