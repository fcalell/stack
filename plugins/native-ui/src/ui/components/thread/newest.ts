import type { ListState } from "@fcalell/ui-core/list-state";
import type { MessageSlots } from "./index";

// What the log announces: the newest message, by its key, with its body as it
// stands. The reader's own message is silence (a `""` text), which `useLive`
// does not take, so the next reply is compared against the last one. `undefined` holds the baseline: a log still waiting for its
// first answer, failed or missing stands as no history, so opening on its
// history, or a retry that lands after a failure, announces nothing. `""` is
// an empty log, so its first message is news.
export function newest<T>(
	items: readonly T[] | undefined,
	state: ListState,
	message: Pick<MessageSlots<T>, "key" | "author" | "body">,
): { text: string | undefined; id?: string } {
	if (state === "pending" || state === "failed" || state === "missing")
		return { text: undefined };
	const last = state === "loaded" ? items?.at(-1) : undefined;
	if (last === undefined) return { text: "" };
	return {
		text: message.author(last) === "you" ? "" : message.body(last),
		id: message.key(last),
	};
}
