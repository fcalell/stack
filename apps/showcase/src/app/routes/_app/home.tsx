import { preload } from "@fcalell/plugin-api/tanstack-query";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { navigate } from "@fcalell/plugin-react-ui/lib/navigate";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/home")({
	loader: ({ context }) => preload(context.queryClient, orpc.tasks.list.read()),
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
	const tasks = orpc.tasks.list.read();
	const [value, setValue] = useState("");
	return (
		<Pane fill title="Home">
			<Section
				title="Tasks"
				items={tasks.at((rows) =>
					rows.map((task) => ({
						key: task.id,
						title: task.title,
						meta: [task.meta],
					})),
				)}
				empty={{ sentence: "No task is open." }}
			/>
			<Section title="Latest">
				<Thread
					items={LATEST}
					message={{
						key: (turn) => turn.id,
						author: (turn) => turn.author,
						name: (turn) => NAME[turn.author],
						body: (turn) => turn.body,
					}}
					composer={{
						value,
						onChange: setValue,
						placeholder: "Ask about your deploys",
						onSend: () => navigate("/assistant"),
					}}
				/>
			</Section>
		</Pane>
	);
}
