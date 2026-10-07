// The ISO moment `minutes` before now: a fixture's age is a moment, so the
// page words it and keeps it current.
export const ago = (minutes: number) =>
	new Date(Date.now() - minutes * 60_000).toISOString();
