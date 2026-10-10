import type { MessageProps } from "../src/ui/components/message/index.tsx";
import type { MessageSlots } from "../src/ui/components/thread/index.tsx";

interface Turn {
	id: string;
	author: "you" | "other" | "system";
	body: string;
	args?: string;
}

// a system Message takes a detail, a turn none
{
	const made: MessageProps[] = [
		{
			author: "system",
			body: "Drafted a note",
			detail: {
				row: { leading: { icon: "FileText" }, title: "Weekly digest" },
			},
		},
		{ author: "system", body: "Ran deploy", detail: { code: "api --prod" } },
		{ author: "system", body: "Read 2 files", detail: { fold: "a\nb" } },
	];
	// @ts-expect-error: a turn carries no detail
	const turn: MessageProps = {
		author: "you",
		body: "x",
		detail: { code: "y" },
	};
	void [made, turn];
}

// a Thread's message map reads each item's detail
{
	const slots: MessageSlots<Turn> = {
		key: (turn) => turn.id,
		author: (turn) => turn.author,
		body: (turn) => turn.body,
		detail: (turn) => (turn.args ? { code: turn.args } : undefined),
	};
	const stranger: MessageSlots<Turn> = {
		...slots,
		// @ts-expect-error: a detail is read from the thread's item
		detail: (n: number) => ({ code: String(n) }),
	};
	void [slots, stranger];
}
