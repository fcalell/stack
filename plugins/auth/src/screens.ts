import { HttpResponse, http } from "@fcalell/plugin-screens/msw";
import { session, user } from "./screens-session.ts";
import { AUTH_PREFIX } from "./types.ts";

// What the screens workbench contributes for the endpoints auth owns outside
// the app's router: the signed-in session better-auth's client reads (phone
// apps, and a web app still on that client), answered at `get-session` under
// the prefix the worker mounts it at. Lives under its own subpath because it
// imports MSW through the screens package, which only the workbench's browser
// loads.
export default [
	http.get(`*${AUTH_PREFIX}/get-session`, () =>
		HttpResponse.json({ session, user }),
	),
];
