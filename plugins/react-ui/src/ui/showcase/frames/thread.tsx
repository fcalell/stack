import type { MessageDetail } from "@fcalell/ui-core/descriptors";
import { useState } from "react";
import { MessageInput } from "../../components/message-input/index.tsx";
import { type MessageSlots, Thread } from "../../components/thread/index.tsx";
import { REPLY, today } from "./message.tsx";

const act = () => {};

interface Turn {
	id: string;
	author: "you" | "other" | "system";
	body: string;
	at: string;
	// A system line that opens what it names.
	opens?: boolean;
	// What stands under a system line.
	detail?: MessageDetail;
}

const NAME = { you: "You", other: "Assistant" } as const;

// The Message slots every turn fills.
export const TURN: MessageSlots<Turn> = {
	key: (turn) => turn.id,
	author: (turn) => turn.author,
	name: (turn) => (turn.author === "system" ? undefined : NAME[turn.author]),
	body: (turn) => turn.body,
	at: (turn) => turn.at,
	onOpen: (turn) => (turn.opens ? act : undefined),
	detail: (turn) => turn.detail,
};

export const TURNS: Turn[] = [
	{
		id: "t1",
		author: "system",
		body: "Thread started from the failed deploy of api",
		at: today("10:02"),
	},
	{
		id: "t2",
		author: "you",
		body: "Why did the last deploy of api fail?",
		at: today("10:02"),
	},
	{
		id: "t3",
		author: "other",
		body: `${REPLY} I can open the migration for you.`,
		at: today("10:03"),
	},
	{
		id: "t4",
		author: "system",
		body: "Relayed from #deploys",
		at: today("10:04"),
		opens: true,
	},
	{
		id: "t4-reads",
		author: "system",
		body: "Read 3 files",
		at: today("10:04"),
		detail: {
			fold: "migrations/0042_add_invoices.sql\nsrc/db/schema.ts\nwrangler.toml",
		},
	},
	{
		id: "t5",
		author: "you",
		body: "Open it, and hold the redeploy until I have read it.",
		at: today("10:05"),
	},
	{
		id: "t6",
		author: "other",
		body: "Opened `0042_add_invoices`. The redeploy waits for you.",
		at: today("10:05"),
	},
	{
		id: "t7",
		author: "system",
		body: "Ran migrate",
		at: today("10:06"),
		detail: { code: "0042_add_invoices --env production" },
	},
	{
		id: "t8",
		author: "system",
		body: "Proposed a redeploy",
		at: today("10:06"),
		detail: {
			row: {
				leading: { icon: "Rocket" },
				title: "Redeploy api to production",
				meta: ["Deploy", "After the migration"],
				status: { state: "waiting", label: "Waits for you" },
				onOpen: act,
			},
		},
	},
];

// Board 53's thread in a Place body (the Place's frame is context): system
// lines (one opening, one folding its reads, a free act over its code, a
// proposal as its row), yours and the assistant's replies, the input in the
// foot with its notice, the answer still working.
export function drawThread() {
	return <Conversation />;
}

function Conversation() {
	const [value, setValue] = useState("");
	const [working, setWorking] = useState(true);
	return (
		<div className="flex flex-col w-screen max-w-full overflow-hidden rounded-card border border-edge bg-surface">
			<div className="flex flex-col gap-sections p-page">
				<Thread
					items={TURNS}
					message={TURN}
					foot={
						<MessageInput
							value={value}
							onChange={setValue}
							onAttach={act}
							placeholder="Ask about this deploy"
							notice={{
								sentence: "12 of 50 answers left this month.",
								act: { label: "Upgrade", onAct: act },
							}}
							working={working}
							onSend={() => {
								setValue("");
								setWorking(true);
							}}
							onStop={() => setWorking(false)}
						/>
					}
				/>
			</div>
		</div>
	);
}
