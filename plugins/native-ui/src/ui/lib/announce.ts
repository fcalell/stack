// What `useLive` last took: the text, `undefined` while a log still waits for
// its first answer, and the identity of what the text belongs to, when it has
// one.
export interface Taken {
	text: string | undefined;
	id?: string;
}

// The text to announce as `now` replaces `before`, or `undefined` for silence.
// `null` is nothing taken yet, so `now` is news. An empty text is silence, and
// so is the first text after a wait (it stands as the baseline). Without an
// id the text is announced when it differs from the last; with one, when the
// id differs, the text it has at that moment, so a stream's chunks are read
// once and a second message with an identical body is still read.
export function announcement(
	before: Taken | null,
	now: Taken,
): string | undefined {
	if (now.text === undefined || now.text === "") return undefined;
	if (before === null) return now.text;
	if (before.text === undefined) return undefined;
	const changed =
		now.id === undefined ? before.text !== now.text : before.id !== now.id;
	return changed ? now.text : undefined;
}
