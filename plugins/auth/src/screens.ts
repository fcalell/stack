import { HttpResponse, http } from "@fcalell/plugin-screens/msw";
import type { Session, User } from "better-auth";
import { AUTH_PREFIX } from "./types.ts";

// What the screens workbench contributes for the endpoints auth owns: the
// signed-in session `useSession()` reads, answered at better-auth's
// `get-session` under the prefix the worker mounts it at, so a screen behind
// the session guard draws its signed-in form. Typed by better-auth's own
// session and user, so a field it adds fails here. Lives under its own
// subpath because it imports MSW through the screens package, which only the
// workbench's browser loads.
const user: User = {
	id: "user_screens",
	name: "Alex Morgan",
	email: "alex.morgan@example.com",
	emailVerified: true,
	image: null,
	createdAt: new Date("2026-01-05T09:00:00.000Z"),
	updatedAt: new Date("2026-01-05T09:00:00.000Z"),
};

const session: Session = {
	id: "session_screens",
	token: "screens",
	userId: user.id,
	ipAddress: null,
	userAgent: null,
	createdAt: new Date("2026-01-05T09:00:00.000Z"),
	updatedAt: new Date("2026-01-05T09:00:00.000Z"),
	expiresAt: new Date("2099-01-01T00:00:00.000Z"),
};

export default [
	http.get(`*${AUTH_PREFIX}/get-session`, () =>
		HttpResponse.json({ session, user }),
	),
];
