import { useQuery } from "@fcalell/plugin-api/tanstack-query";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { MessageInput } from "@fcalell/plugin-react-ui/components/message-input";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { navigate } from "@fcalell/plugin-react-ui/lib/navigate";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/home")({
	component: Home,
});

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
function Home() {
	const tasks = useQuery(orpc.tasks.list.queryOptions());
	const [value, setValue] = useState("");
	return (
		<Place
			title="Home"
			foot={
				<MessageInput
					value={value}
					onChange={setValue}
					placeholder="Ask about your deploys"
					onSend={() => navigate("/assistant")}
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
