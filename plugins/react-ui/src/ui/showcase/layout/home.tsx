import { useState } from "react";
import { Group } from "../../components/group/index.tsx";
import { List } from "../../components/list/index.tsx";
import { MessageInput } from "../../components/message-input/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Thread } from "../../components/thread/index.tsx";
import { navigate } from "../../lib/navigate.ts";
import { useFixture, useTo } from "./here.ts";

const TASKS = [
	{ id: "k1", title: "Review the failed deploy of acme-web", meta: "Today" },
	{ id: "k2", title: "Renew the acme.dev certificate", meta: "In 3 days" },
	{ id: "k3", title: "Invite the new on-call engineer", meta: "This week" },
	{ id: "k4", title: "Move the build image to Node 20", meta: "Next week" },
	{ id: "k5", title: "Prune the stale preview deploys", meta: "Next week" },
];

const LATEST = [
	{
		id: "l1",
		author: "you" as const,
		body: "How much of the plan is used this month?",
	},
	{
		id: "l2",
		author: "other" as const,
		body: "`acme-web` serves 412,000 requests this month, 41 % of the Team plan.",
	},
];

const NAME = { you: "You", other: "Assistant" } as const;

// An assistant's home: its tasks and the latest exchange as sections that
// scroll under the ask field docked at the foot; a question sent opens the
// conversation.
export function Home() {
	const to = useTo();
	const tasks = useFixture(TASKS);
	const [value, setValue] = useState("");
	return (
		<Place
			title="Home"
			foot={
				<MessageInput
					value={value}
					onChange={setValue}
					placeholder="Ask about your deploys"
					onSend={() => navigate(to({ place: "assistant" }))}
				/>
			}
		>
			<Section title="Tasks">
				<Group>
					<List
						query={tasks}
						sentence="Tasks did not load."
						empty={{ sentence: "No task is open." }}
						row={{
							key: (task) => task.id,
							title: (task) => task.title,
							meta: (task) => [task.meta],
						}}
					/>
				</Group>
			</Section>
			<Section title="Latest">
				<Thread
					items={LATEST}
					message={{
						key: (turn) => turn.id,
						author: (turn) => turn.author,
						name: (turn) => NAME[turn.author],
						body: (turn) => turn.body,
					}}
				/>
			</Section>
		</Place>
	);
}
