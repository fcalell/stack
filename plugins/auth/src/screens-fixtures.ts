import type { Fixtures } from "@fcalell/plugin-screens/fixtures";
import { session, user } from "./screens-session.ts";
import type { sessionProcedures } from "./worker/procedures.ts";

// What the screens workbench contributes for the procedures auth owns: the
// signed-in session `orpc.auth.session` reads, so a screen behind the session
// guard draws its signed-in form. The app overrides it in `src/app/fixtures.ts`,
// starting from this answer when it only adds to it: the tree keeps its own
// type (`satisfies`, not an annotation), so `fixtures.auth.session()` is the
// signed-in `{ session, user }` itself, with no optional or null in the way.
const fixtures = {
	auth: { session: () => ({ session, user }) },
} satisfies Fixtures<{
	auth: Pick<ReturnType<typeof sessionProcedures>, "session">;
}>;

export default fixtures;
