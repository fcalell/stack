import type { Attachment, Notice } from "@fcalell/ui-core/descriptors";
import { useRef, useState } from "react";
import { MessageInput } from "../../components/message-input/index.tsx";
import { Place } from "../../components/place/index.tsx";
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

// The composer's draft attachment and notice, drawn in every state: neither
// is part of the query.
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

// While an answer comes, the notice says what becomes of a message sent then.
const QUEUED: Notice = {
	sentence: "A message sent now is read once this answer ends.",
};

// The conversation: its history a query, a sent turn and its answer joining
// the history as the server holds them (an empty one too); the input under
// every state, inert until the history answers. A message sent while an
// answer comes is answered next.
export function Assistant() {
	const to = useTo();
	const [sent, setSent] = useState<Turn[]>([]);
	const history = useFixture(TURNS);
	const query = {
		...history,
		data: history.data && [...history.data, ...sent],
	};
	const [value, setValue] = useState("");
	const [attachments, setAttachments] = useState<Attachment[]>(ATTACHED);
	const [working, setWorking] = useState(false);
	const answer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const queued = useRef(false);
	const say = (turn: Omit<Turn, "id" | "at">) =>
		setSent((all) => [
			...all,
			{ ...turn, id: `s${all.length + 1}`, at: new Date().toISOString() },
		]);
	const reply = () => {
		setWorking(true);
		answer.current = setTimeout(() => {
			say({ author: "other", body: ANSWER });
			if (queued.current) {
				queued.current = false;
				reply();
			} else setWorking(false);
		}, 2400);
	};
	return (
		<Place title="Assistant">
			<Thread
				query={query}
				sentence="The conversation did not load."
				empty={{
					title: "Ask about your deploys",
					sentence:
						"Why a deploy failed, what changed between two, or how much of the plan is used.",
				}}
				message={{
					key: (turn) => turn.id,
					author: (turn) => turn.author,
					name: (turn) =>
						turn.author === "system" ? undefined : NAME[turn.author],
					body: (turn) => turn.body,
					at: (turn) => turn.at,
					onOpen: (turn) => {
						const { deploy } = turn;
						if (deploy === undefined) return undefined;
						return () => navigate(to({ place: "deploys", record: deploy }));
					},
				}}
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
						notice={working ? QUEUED : notice(to)}
						working={working}
						disabled={query.data === undefined}
						onSend={() => {
							say({ author: "you", body: value });
							setValue("");
							setAttachments([]);
							if (working) queued.current = true;
							else reply();
						}}
						onStop={() => {
							clearTimeout(answer.current);
							queued.current = false;
							setWorking(false);
							say({ author: "system", body: "Answer stopped" });
							toast("Answer stopped");
						}}
					/>
				}
			/>
		</Place>
	);
}
