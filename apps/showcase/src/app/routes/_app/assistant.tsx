import { useQuery } from "@fcalell/plugin-api/tanstack-query";
import { MessageInput } from "@fcalell/plugin-react-ui/components/message-input";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { navigate } from "@fcalell/plugin-react-ui/lib/navigate";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import type { Attachment, Notice } from "@fcalell/ui-core/descriptors";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type { AppRouter } from "../../../../.stack/worker";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/assistant")({
	component: Assistant,
});

type Turn = AppRouter["assistant"]["history"]["__output"][number];

const ANSWER =
	"`acme-web` serves 412,000 requests this month, 41 % of the Team plan. Most come from `acme-web` itself; the rest from `acme-api`.";

const NAME = { you: "You", other: "Assistant" } as const;

// The composer's draft attachment and notice, drawn in every state: neither
// is part of the query.
const ATTACHED: Attachment[] = [{ id: "log", name: "build-0c5e4aa.log" }];

function notice(): Notice {
	return {
		sentence: "12 of 50 answers left this month.",
		act: {
			label: "See usage",
			onAct: () => navigate("/usage"),
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
function Assistant() {
	const [sent, setSent] = useState<Turn[]>([]);
	const history = useQuery(orpc.assistant.history.queryOptions());
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
						return () => navigate(`/deploys/${deploy}`);
					},
				}}
				foot={
					<MessageInput
						value={value}
						onChange={setValue}
						attachments={attachments}
						onAttach={(files) =>
							setAttachments((all) => [
								...all,
								...files.map((file) => ({
									id: crypto.randomUUID(),
									name: file.name,
									src: file.src,
								})),
							])
						}
						onDetach={(id) => {
							const gone = attachments.find((each) => each.id === id)?.src;
							if (gone?.startsWith("blob:")) URL.revokeObjectURL(gone);
							setAttachments((all) => all.filter((each) => each.id !== id));
						}}
						placeholder="Ask about your deploys"
						notice={working ? QUEUED : notice()}
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
