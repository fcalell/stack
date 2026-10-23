import {
	preload,
	type Read,
	read,
	streamedQuery,
	useQueryClient,
} from "@fcalell/plugin-api/tanstack-query";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { navigate } from "@fcalell/plugin-react-ui/lib/navigate";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import type { Attachment, Notice } from "@fcalell/ui-core/descriptors";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type { AppRouter } from "../../../../.stack/worker";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/assistant")({
	loader: ({ context }) =>
		preload(context.queryClient, orpc.assistant.history.read()),
	component: Assistant,
});

type Turn = AppRouter["assistant"]["history"]["__output"][number];

const ANSWER =
	"`acme-web` serves 412,000 requests this month, 41 % of the Team plan. Most come from `acme-web` itself; the rest from `acme-api`.";

// The answer arrives a word at a time, after a first wait.
const WORDS = ANSWER.split(/(?<= )/);
const FIRST = 900;
const PACE = 90;
// A message that begins so gets an answer whose stream breaks part way, which
// draws the stopped line with its Retry.
const BREAKS = "/break";
const BREAKS_AT = 4;

const pause = (ms: number, signal: AbortSignal) =>
	new Promise<void>((resolve) => {
		const timer = setTimeout(resolve, ms);
		signal.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				resolve();
			},
			{ once: true },
		);
	});

// The words of one answer, ending where the read is cancelled.
async function* spoken(signal: AbortSignal, breaks: boolean) {
	for (const [at, word] of WORDS.entries()) {
		await pause(at === 0 ? FIRST : PACE, signal);
		if (signal.aborted) return;
		if (breaks && at === BREAKS_AT) throw new Error("The stream broke.");
		yield word;
	}
}

const NAME = { you: "You", other: "Assistant" } as const;

// The composer's draft attachment and notice, drawn in every state: neither
// is part of the query.
const ATTACHED: Attachment[] = [{ id: "log", name: "build-0c5e4aa.log" }];

function notice(): Notice {
	return {
		sentence: "12 of 50 answers left this month.",
		act: { label: "See usage", href: "/usage" },
	};
}

// While an answer comes, the notice says what becomes of a message sent then.
const QUEUED: Notice = {
	sentence: "A message sent now is read once this answer ends.",
};

// One answer as a stream read: the turn grows a word at a time in the read's
// own data, so a word renders the Thread's reply turn and nothing else. When
// the stream ends, `done` gets the whole turn, which the history then holds.
function answerOf(
	id: string,
	breaks: boolean,
	done: (turn: Turn) => void,
): Read<Turn> {
	const stream = streamedQuery<string, Turn>({
		streamFn: ({ signal }) => spoken(signal, breaks),
		reducer: (turn, word) => ({ ...turn, body: turn.body + word }),
		initialValue: {
			id,
			author: "other",
			body: "",
			at: new Date().toISOString(),
		},
	});
	return read<Turn>(
		{
			queryKey: ["assistant", "answer", id],
			queryFn: async (context) => {
				const turn = await stream(context);
				if (!context.signal.aborted) done(turn);
				return turn;
			},
			staleTime: Number.POSITIVE_INFINITY,
			retry: false,
		},
		{ kind: "stream" },
	);
}

// The conversation: its history a read the Pane holds, a sent turn written
// into the history as the server holds it (an empty one too) and its answer
// streamed in after it, joining the history when it ends; the input docked in
// the Pane's foot, inert until the history answers. A message sent while an
// answer comes is answered next.
function Assistant() {
	const queryClient = useQueryClient();
	const history = orpc.assistant.history.read();
	const [value, setValue] = useState("");
	const [attachments, setAttachments] = useState<Attachment[]>(ATTACHED);
	const [working, setWorking] = useState(false);
	const [answer, setAnswer] = useState<Read<Turn>>();
	const asked = useRef(0);
	const queued = useRef<string>(undefined);
	const record = (turn: Turn) =>
		queryClient.setQueryData<readonly Turn[]>(
			history.options.queryKey,
			(all = []) => [...all, turn],
		);
	const say = (turn: Omit<Turn, "id" | "at">) =>
		queryClient.setQueryData<readonly Turn[]>(
			history.options.queryKey,
			(all = []) => [
				...all,
				{ ...turn, id: `s${all.length + 1}`, at: new Date().toISOString() },
			],
		);
	const reply = (question: string) => {
		setWorking(true);
		asked.current += 1;
		setAnswer(
			answerOf(`a${asked.current}`, question.startsWith(BREAKS), (turn) => {
				record(turn);
				const next = queued.current;
				queued.current = undefined;
				if (next === undefined) setWorking(false);
				else reply(next);
			}),
		);
	};
	return (
		<Pane fill title="Assistant">
			<Thread
				items={history}
				empty={{
					sentence:
						"Ask about your deploys: why one failed, what changed between two, or how much of the plan is used.",
				}}
				reply={answer}
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
				composer={{
					value,
					onChange: setValue,
					attachments,
					onAttach: (files) =>
						setAttachments((all) => [
							...all,
							...files.map((file) => ({
								id: crypto.randomUUID(),
								name: file.name,
								src: file.src,
							})),
						]),
					onDetach: (id) => {
						const gone = attachments.find((each) => each.id === id)?.src;
						if (gone?.startsWith("blob:")) URL.revokeObjectURL(gone);
						setAttachments((all) => all.filter((each) => each.id !== id));
					},
					placeholder: "Ask about your deploys",
					notice: working ? QUEUED : notice(),
					working,
					onSend: () => {
						say({ author: "you", body: value });
						setValue("");
						setAttachments([]);
						if (working) queued.current = value;
						else reply(value);
					},
					onStop: () => {
						// The words so far stay in the conversation, then the line
						// that says the answer was stopped.
						if (answer) {
							const { queryKey } = answer.options;
							const partial = queryClient.getQueryData<Turn>(queryKey);
							void queryClient.cancelQueries({ queryKey });
							if (partial?.body) record(partial);
						}
						setAnswer(undefined);
						queued.current = undefined;
						setWorking(false);
						say({ author: "system", body: "Answer stopped" });
						toast("Answer stopped");
					},
				}}
			/>
		</Pane>
	);
}
