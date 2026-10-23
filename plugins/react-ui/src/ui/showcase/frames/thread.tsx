import { type Datum, read } from "@fcalell/plugin-api/tanstack-query";
import type {
	Attachment,
	MessageDetail,
	Run,
} from "@fcalell/ui-core/descriptors";
import { useMemo, useState } from "react";
import { Pane } from "../../components/pane/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Place } from "../../components/shell/place.tsx";
import { type MessageSlots, Thread } from "../../components/thread/index.tsx";
import { isFirstCell, type ShowcaseFrame } from "../cells.ts";
import { endedAt, itemsAt } from "../waiting.ts";
import { StandInList } from "./layout-context.tsx";
import { ATTACHED, drawMessages, REPLY, today } from "./message.tsx";
import { drawComposer } from "./message-input.tsx";
import { Column } from "./place.tsx";

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
	// What came with a turn, and where it came from.
	attachments?: Attachment[];
	meta?: Run[];
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
	attachments: (turn) => turn.attachments,
	meta: (turn) => turn.meta,
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
		meta: ["by voice", "Kitchen"],
	},
	{
		id: "t5-shot",
		author: "you",
		body: "Why did this payment fail?",
		at: today("10:05"),
		attachments: ATTACHED,
	},
	{
		id: "t6",
		author: "other",
		body: "Opened `0042_add_invoices`. The redeploy waits for you.",
		at: today("10:05"),
	},
	{
		id: "t6-log",
		author: "other",
		body: "The log of that deploy is attached.",
		at: today("10:05"),
		attachments: ATTACHED.slice(1),
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
				status: { tone: "waiting", label: "Waits for you" },
				onOpen: act,
			},
		},
	},
	{
		id: "t9",
		author: "system",
		body: "Named the change set",
		at: today("10:06"),
		detail: {
			row: {
				leading: { icon: "GitBranch" },
				title: {
					quoted: "Backfill the invoice totals before the redeploy goes out",
				},
				meta: ["Change set"],
				onOpen: act,
			},
		},
	},
];

// The cells only the composer draws; its other cells (a chip, a thumbnail, the
// meta line) it shares with a message, and every other cell is a message's.
const COMPOSER_ONLY = /^(BUTTON|FIELD|CHIP\.trailing|ICON\.fit\.control)/;
const SHARED =
	/^(CHIP|IMAGE|ICON\.fit\.meta|TEXT\.role\.meta|MESSAGE_ATTACHMENTS)/;

// Board 53's thread in a Pane's body among its sections, under one: system
// lines (one opening, one folding its reads, a free act over its code, a
// proposal as its row), yours and the assistant's replies, the composer under
// them with its notice, the answer still working. No frame holds the thread's
// read: the thread is a frame of its items, so each frame draws its state in
// the log's place with the composer kept: the painted messages, the empty sentence,
// the failed and missing forms, the conversation. The error state also draws a
// stream that stopped. The first cell draws these states and the
// disabled composer once; every cell draws the messages and composer frames
// its part names, the paint cell a reply beside its painted form.
export function drawThread(frame: ShowcaseFrame) {
	const { id, state } = frame;
	const cell = frame.cell.name;
	if (state === "disabled")
		return isFirstCell(frame) ? drawComposer(frame) : undefined;
	if (state === "rest") {
		const parts = (
			<>
				{COMPOSER_ONLY.test(cell) || SHARED.test(cell)
					? drawComposer(frame)
					: null}
				{COMPOSER_ONLY.test(cell) ? null : drawMessages(frame)}
			</>
		);
		return isFirstCell(frame) ? (
			<>
				<Conversation id={id} items={itemsAt(`${id}/turns`, "rest", TURNS)} />
				{parts}
			</>
		) : (
			parts
		);
	}
	if (!isFirstCell(frame)) return undefined;
	if (state === "empty" || state === "error")
		return (
			<>
				{endedAt<Turn>(id, state).map(({ title, items }) => (
					<Conversation key={title} id={`${id}/${title}`} items={items} />
				))}
				{state === "error" ? (
					<Conversation
						id={`${id}/stopped`}
						items={itemsAt(`${id}/turns`, "rest", TURNS)}
						stream="error"
					/>
				) : null}
			</>
		);
	return (
		<Conversation
			id={id}
			items={itemsAt(
				`${id}/turns`,
				state === "streaming" ? "rest" : state,
				TURNS,
			)}
			stream={state === "streaming" ? state : undefined}
		/>
	);
}

// The turn being written, as the read of a stream holds it: the first words of
// the answer with an emphasis still open. `streaming` has the stream running
// over them, `error` has it failed over them.
const PARTIAL: Turn = {
	id: "t10",
	author: "other",
	body: "The migration adds a **NOT NULL column with no default, so the `invoices",
	at: today("10:07"),
};

function replyAt(id: string, state: "streaming" | "error") {
	return read(
		{
			queryKey: ["showcase", id, "reply"],
			queryFn: (): Promise<Turn> =>
				state === "error"
					? Promise.reject(new Error("The showcase stream fails."))
					: new Promise<never>(() => {}),
			initialData: PARTIAL,
			staleTime: 0,
			retry: false,
		},
		{ kind: "stream" },
	);
}

function Conversation(props: {
	id: string;
	items: Datum<readonly Turn[]>;
	stream?: "streaming" | "error";
}) {
	const [value, setValue] = useState("");
	const [working, setWorking] = useState(true);
	const { id, stream } = props;
	const reply = useMemo(
		() => (stream ? replyAt(id, stream) : undefined),
		[id, stream],
	);
	return (
		<Column>
			<Place>
				<Pane fill title="Assistant">
					{/* A Section over the Thread: on the desktop the messages start where its rows start and end at the measure. */}
					<Section title="Deploys">
						<StandInList />
					</Section>
					<Thread
						items={props.items}
						message={TURN}
						reply={reply}
						composer={{
							value,
							onChange: setValue,
							onAttach: act,
							placeholder: "Ask about this deploy",
							notice: {
								sentence: "12 of 50 answers left this month.",
								act: { label: "Upgrade", onAct: act },
							},
							working,
							onSend: () => {
								setValue("");
								setWorking(true);
							},
							onStop: () => setWorking(false),
						}}
					/>
				</Pane>
			</Place>
		</Column>
	);
}
