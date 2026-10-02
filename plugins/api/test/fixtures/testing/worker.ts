// Composed as `.stack/worker.ts` is generated: a default export and its
// router type, with an env check the test entry's env must pass.
import createWorker from "../../../src/worker/index.ts";
import * as routes from "./routes/index.ts";

const worker = createWorker({
	prefix: "/rpc",
	envChecks: [{ name: "FIXTURE_SECRET", minLength: 16 }],
}).handler(routes);

export type AppRouter = typeof worker._router;
export default worker;
