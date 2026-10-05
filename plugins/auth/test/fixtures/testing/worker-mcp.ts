// Composed as `.stack/worker.ts` is generated for a sqlite consumer with
// organizations and `mcp` on: a probe that verifies the bearer token it
// carries, and the procedures an MCP endpoint serves as a granted member.
import { createProcedure } from "@fcalell/plugin-api/procedure";
import createWorker, { type AppBuilder } from "@fcalell/plugin-api/runtime";
import dbRuntime from "@fcalell/plugin-db/runtime/sqlite";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import * as authSchema from "../../../src/schema/index.ts";
import * as oauthSchema from "../../../src/schema/oauth.ts";
import * as organizationSchema from "../../../src/schema/organization.ts";
import { organization } from "../../../src/scope.ts";
import authRuntime from "../../../src/worker/index.ts";
import mcp from "./mcp.ts";

const statements = { organization: ["update"] } as const;

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
			organization: {
				statements,
				roles: {
					owner: { organization: ["update"] },
					admin: { organization: ["update"] },
					editor: {},
					viewer: {},
				},
			},
			mcp: true,
		}),
	);
type Context = typeof chain extends AppBuilder<infer C> ? C : never;
const procedure = createProcedure<Context, typeof statements, string>();

export const routes = {
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
		// The signed-in caller: an agent when its token verified.
		caller: procedure({ auth: true }).query(({ context }) => ({
			userId: context.user.id,
			agent: context.user.agent === true,
		})),
		organization: procedure({ auth: true, scope: organization }).query(
			({ context }) => ({ role: context.member.role }),
		),
		rename: procedure({
			auth: true,
			scope: organization,
			can: ["update", "organization"],
		}).mutation(() => ({ ok: true })),
		// Not an MCP tool: the test's way to the runtime's `revokeGrant`.
		revoke: procedure({})
			.input(z.object({ grantId: z.string() }))
			.mutation(({ context, input }) =>
				context.oauth.revokeGrant(input.grantId),
			),
	},
};

const worker = chain.handler(routes, { mcp, name: "probe" });

export type AppRouter = typeof worker._router;
export default worker;
