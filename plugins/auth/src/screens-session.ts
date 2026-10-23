import type { Session, User } from "better-auth";

// The signed-in session the screens workbench answers with, in one place for
// both ways a screen reads it: better-auth's `get-session` endpoint
// (`./screens.ts`) and the `auth.session` procedure (`./screens-fixtures.ts`).
// Typed by better-auth's own session and user, so a field it adds fails here.
export const user: User = {
	id: "user_screens",
	name: "Alex Morgan",
	email: "alex.morgan@example.com",
	emailVerified: true,
	image: null,
	createdAt: new Date("2026-01-05T09:00:00.000Z"),
	updatedAt: new Date("2026-01-05T09:00:00.000Z"),
};

export const session: Session = {
	id: "session_screens",
	token: "screens",
	userId: user.id,
	ipAddress: null,
	userAgent: null,
	createdAt: new Date("2026-01-05T09:00:00.000Z"),
	updatedAt: new Date("2026-01-05T09:00:00.000Z"),
	expiresAt: new Date("2099-01-01T00:00:00.000Z"),
};
