// The same consumer without organizations: no tenancy, one signed-in probe.
import { createProcedure } from "@fcalell/plugin-api/procedure";
import createWorker, { type AppBuilder } from "@fcalell/plugin-api/runtime";
import dbRuntime from "@fcalell/plugin-db/runtime/sqlite";
import * as authSchema from "../../../src/schema/index.ts";
import authRuntime from "../../../src/worker/index.ts";

const chain = createWorker({ prefix: "/rpc" })
	.use(dbRuntime({ fileVar: "DB_FILE", schema: authSchema }))
	.use(
		authRuntime({
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
			trustedOrigins: ["http://localhost"],
			emailOtp: false,
			cookies: { prefix: "probe" },
		}),
	);
type Context = typeof chain extends AppBuilder<infer C> ? C : never;
const procedure = createProcedure<Context, Record<never, never>, string>();

const worker = chain.handler({
	probe: {
		me: procedure({ auth: true }).query(({ context }) => context.user.id),
	},
});

export type AppRouter = typeof worker._router;
export default worker;
