import type { Attachment, Notice } from "@fcalell/ui-core/descriptors";
import { useRef, useState } from "react";
import { Message } from "../../components/message/index.tsx";
import { MessageInput } from "../../components/message-input/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { QueryBoundary } from "../../components/query-boundary/index.tsx";
import { Thread } from "../../components/thread/index.tsx";
import { navigate } from "../../lib/navigate.ts";
import { toast } from "../../lib/toast.ts";
import { useFixture, useTo } from "./here.ts";

interface Turn {
	id: string;
	author: "you" | "other" | "system";
	body: string;
	at: string;
	// A system line that opens a deploy.
	deploy?: string;
}

// A moment today at a clock time, as the ISO string a Message formats.
function today(time: string): string {
	const [hours = 0, minutes = 0] = time.split(":").map(Number);
	const at = new Date();
	at.setHours(hours, minutes, 0, 0);
	return at.toISOString();
}

const TURNS: Turn[] = [
	{
		id: "t1",
		author: "system",
		body: "Started from the failed deploy 0c5e4aa",
		at: today("09:53"),
		deploy: "d3",
	},
	{
		id: "t2",
		author: "you",
		body: "Why did the deploy of acme-web fail?",
		at: today("09:53"),
	},
	{
		id: "t3",
		author: "other",
		body: `The install failed: \`wrangler@4.12.0\` needs Node 20, and the build image is Node 18.

Pick one:

1. Move the build image to **Node 20** under Settings, then redeploy.
2. Pin \`wrangler\` back to \`^4.10.0\` in \`package.json\`.

Node 18 leaves the build images on Oct 12, so the first keeps working longer.`,
		at: today("09:54"),
	},
	{
		id: "t4",
		author: "you",
		body: "Move it to Node 20 and redeploy.",
		at: today("09:56"),
	},
	{
		id: "t5",
		author: "system",
		body: "Ana Ruiz redeployed a41c9e2",
		at: today("10:40"),
		deploy: "d1",
	},
	{
		id: "t6",
		author: "other",
		body: "The redeploy is building on Node 20. The install restored its cache, so it should be ready in about two minutes.",
		at: today("10:41"),
	},
];

const ANSWER =
	"`acme-web` serves 412,000 requests this month, 41 % of the Team plan. Most come from `acme-web` itself; the rest from `acme-api`.";

const NAME = { you: "You", other: "Assistant" } as const;

// The composer's draft attachment and notice, drawn in both forms: neither is
// part of the query.
const ATTACHED: Attachment[] = [{ id: "log", name: "build-0c5e4aa.log" }];

function notice(to: ReturnType<typeof useTo>): Notice {
	return {
		sentence: "12 of 50 answers left this month.",
		act: {
			label: "See usage",
			onAct: () => navigate(to({ place: "usage" })),
		},
	};
}

function Conversation(props: { initial: Turn[] }) {
	const to = useTo();
	const [turns, setTurns] = useState(props.initial);
	const [value, setValue] = useState("");
	const [attachments, setAttachments] = useState<Attachment[]>(ATTACHED);
	const [working, setWorking] = useState(false);
	const answer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const say = (turn: Omit<Turn, "id" | "at">) =>
		setTurns((all) => [
			...all,
			{ ...turn, id: `t${all.length + 1}`, at: new Date().toISOString() },
		]);
	return (
		<Thread
			foot={
				<MessageInput
					value={value}
					onChange={setValue}
					attachments={attachments}
					onAttach={() =>
						setAttachments((all) => [
							...all,
							{ id: `file${all.length}`, name: "wrangler.jsonc" },
						])
					}
					onDetach={(id) =>
						setAttachments((all) => all.filter((each) => each.id !== id))
					}
					placeholder="Ask about your deploys"
					notice={notice(to)}
					working={working}
					onSend={() => {
						say({ author: "you", body: value });
						setValue("");
						setAttachments([]);
						setWorking(true);
						answer.current = setTimeout(() => {
							say({ author: "other", body: ANSWER });
							setWorking(false);
						}, 2400);
					}}
					onStop={() => {
						clearTimeout(answer.current);
						setWorking(false);
						say({ author: "system", body: "Answer stopped" });
						toast("Answer stopped");
					}}
				/>
			}
		>
			{turns.map((turn) =>
				turn.author === "system" ? (
					<Message
						key={turn.id}
						author="system"
						body={turn.body}
						at={turn.at}
						onOpen={
							turn.deploy
								? () =>
										navigate(
											to({ place: "deploys", record: turn.deploy ?? "" }),
										)
								: undefined
						}
					/>
				) : (
					<Message
						key={turn.id}
						author={turn.author}
						name={NAME[turn.author]}
						body={turn.body}
						at={turn.at}
					/>
				),
			)}
		</Thread>
	);
}

// The thread's own loading form: a turn of each author, the input inert
// under its notice.
function Waiting() {
	const to = useTo();
	return (
		<Thread
			foot={
				<MessageInput
					value=""
					onChange={() => {}}
					onSend={() => {}}
					attachments={ATTACHED}
					onAttach={() => {}}
					placeholder="Ask about your deploys"
					notice={notice(to)}
					disabled
				/>
			}
		>
			<Message author="system" body="" loading />
			<Message author="you" body="" loading />
			<Message author="other" body="" loading />
		</Thread>
	);
}

export function Assistant() {
	const query = useFixture(TURNS);
	return (
		<Place title="Assistant">
			<QueryBoundary
				query={query}
				sentence="The conversation did not load."
				loading={<Waiting />}
			>
				{(turns) => <Conversation initial={turns} />}
			</QueryBoundary>
		</Place>
	);
}
