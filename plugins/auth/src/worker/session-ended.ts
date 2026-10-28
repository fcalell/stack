import { channel } from "node:diagnostics_channel";

// Where the worker says a session is over. Better Auth deletes a session row
// on a sign-out, a revoke, a deleted user or an expired session found, and
// each deletion is published here as `{ sessionId, userId }`. The Node
// target listens and closes that session's WebSocket connections, whose
// session it read once at the upgrade; where nothing listens (Workers, a
// worker under test) the message goes nowhere. Named, not imported: the Node
// target names the same channel, as it names auth's path.
export const SESSION_ENDED_CHANNEL = "stack:auth:session-ended";

const ended = channel(SESSION_ENDED_CHANNEL);

export function publishSessionEnded(session: {
	id: string;
	userId: string;
}): void {
	if (!ended.hasSubscribers) return;
	ended.publish({ sessionId: session.id, userId: session.userId });
}
