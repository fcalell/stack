import { preload } from "@fcalell/plugin-api/tanstack-query";
import { Columns } from "@fcalell/plugin-react-ui/components/columns";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { createFileRoute } from "@tanstack/react-router";
import { act } from "../../lib/act.ts";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/projects")({
	loader: ({ context }) =>
		preload(context.queryClient, ...STAGES.map((one) => projectsOf(one.stage))),
	component: Projects,
});

const STAGES = [
	{ stage: "building", title: "Building" },
	{ stage: "preview", title: "Preview" },
	{ stage: "production", title: "Production" },
] as const;

// A stage's projects: the read the card draws and the route preloads.
const projectsOf = (stage: (typeof STAGES)[number]["stage"]) =>
	orpc.projects.list.read({ stage });

// A stage's projects, from their own read, on the stage's card.
function Stage(props: { stage: (typeof STAGES)[number] }) {
	const { stage, title } = props.stage;
	const projects = projectsOf(stage);
	return (
		<Section
			title={title}
			items={projects.at((rows) =>
				rows.map((project) => ({
					key: project.name,
					leading: { icon: "Folder" as const },
					title: project.name,
					meta: [project.meta],
					trailing: { age: project.age },
					href: `#${project.name}`,
				})),
			)}
			empty={{ sentence: `No project is in ${title}.` }}
		/>
	);
}

function Projects() {
	return (
		<Pane
			title="Projects"
			actions={[{ icon: "Plus", label: "New project", onAct: act }]}
		>
			<Columns>
				{STAGES.map((stage) => (
					<Stage key={stage.stage} stage={stage} />
				))}
			</Columns>
		</Pane>
	);
}
