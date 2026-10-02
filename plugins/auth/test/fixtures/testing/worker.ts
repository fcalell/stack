// Composed as `.stack/worker.ts` is generated for a sqlite consumer with
// organizations on: four roles named like a consumer's, two of them granted
// the organization update, and probe procedures typed off the chain.
import { createProcedure } from "@fcalell/plugin-api/procedure";
import createWorker, { type AppBuilder } from "@fcalell/plugin-api/runtime";
import dbRuntime from "@fcalell/plugin-db/runtime/sqlite";
import * as authSchema from "../../../src/schema/index.ts";
import * as organizationSchema from "../../../src/schema/organization.ts";
import { organization } from "../../../src/scope.ts";
import authRuntime from "../../../src/worker/index.ts";

const statements = { organization: ["update"] } as const;

const chain = createWorker({ prefix: "/rpc" })
	.use(
		dbRuntime({
			fileVar: "DB_FILE",
			schema: { ...authSchema, ...organizationSchema },
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
		}),
	);
type Context = typeof chain extends AppBuilder<infer C> ? C : never;
const procedure = createProcedure<Context, typeof statements, string>();

const worker = chain.handler({
	probe: {
		organization: procedure({ auth: true, scope: organization }).query(
			({ context }) => ({
				slug: context.organization.slug,
				role: context.member.role,
			}),
		),
		rename: procedure({
			auth: true,
			scope: organization,
			can: ["update", "organization"],
		}).mutation(() => ({ ok: true })),
	},
});

export type AppRouter = typeof worker._router;
export default worker;
