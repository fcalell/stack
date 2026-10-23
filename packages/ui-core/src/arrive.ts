// The keys that arrived on their own: those of `keys` the page did not hold
// when it first drew them. Nothing is known before the first draw, so that
// draw has no arrivals; every later key that was not known is one, whoever
// added it: a row the server pushed fades in and pushes at once, and one the
// viewer's act added fades in the same way.
export function arrivals(
	known: ReadonlySet<string> | undefined,
	keys: readonly string[],
): ReadonlySet<string> {
	if (known === undefined) return new Set();
	return new Set(keys.filter((key) => !known.has(key)));
}
