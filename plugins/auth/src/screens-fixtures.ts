import type { Fixtures } from "@fcalell/plugin-screens/fixtures";
import { session, user } from "./screens-session.ts";
import type { sessionProcedures } from "./worker/procedures.ts";

// What the screens workbench contributes for the procedures auth owns: the
// signed-in session `orpc.auth.session` reads, so a screen behind the session
// guard draws its signed-in form. The app overrides it in `src/app/fixtures.ts`.
const fixtures: Fixtures<{
	auth: Pick<ReturnType<typeof sessionProcedures>, "session">;
}> = {
	auth: { session: () => ({ session, user }) },
};

export default fixtures;
