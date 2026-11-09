import { combine, useMutation } from "@fcalell/plugin-api/tanstack-query";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/sprints")({
	component: Sprints,
});

// The sprints of a team. The Pane holds the tasks' read, so each Section holds
// the one read of its own: the first its bands (`groups` a read, a sprint each,
// over rows that wait for them), the second the owners its rows name (its
// `items` the join of the tasks and the owners). The first's rows pick an owner
// from the same read, which the sheet says once when it fails.
function Sprints() {
	const tasks = orpc.sprints.tasks.read();
	const bands = orpc.sprints.bands.read();
	const owners = orpc.sprints.owners.read();
	const assign = useMutation(orpc.sprints.assign.mutationOptions());
	return (
		<Pane read={tasks}>
			<Section
				title="Tasks"
				description="Filed by sprint."
				items={tasks.at((rows) =>
					rows.map((task) => ({
						key: task.id,
						title: task.title,
						facts: [task.area],
						group: task.sprint,
						pick: {
							label: `Owner of ${task.title}`,
							options: owners.at((all) => all),
							value: task.owner,
							onChange: (owner: string) =>
								assign.mutateAsync({ id: task.id, owner }),
						},
					})),
				)}
				groups={bands.at((all) => all)}
				empty={{ sentence: "No task in a sprint yet." }}
			/>
			<Section
				title="Assigned"
				description="Who each task is with."
				items={combine([tasks, owners], (rows, all) =>
					rows.map((task) => ({
						key: task.id,
						title: task.title,
						facts: [
							all.find((owner) => owner.value === task.owner)?.label ??
								"Nobody",
						],
					})),
				)}
				empty={{ sentence: "No task is assigned." }}
			/>
		</Pane>
	);
}
