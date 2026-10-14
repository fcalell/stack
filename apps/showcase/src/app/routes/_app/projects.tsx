import { Columns } from "@fcalell/plugin-react-ui/components/columns";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { createFileRoute } from "@tanstack/react-router";
import { act } from "../../lib/act.ts";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/projects")({
	component: Projects,
});

const STAGES = [
	{ stage: "building", title: "Building" },
	{ stage: "preview", title: "Preview" },
	{ stage: "production", title: "Production" },
] as const;

// A stage's projects, from their own read, on the stage's card.
function Stage(props: { stage: (typeof STAGES)[number] }) {
	const { stage, title } = props.stage;
	const projects = orpc.projects.list.read({ stage });
	return (
		<Section
			title={title}
			read={projects}
			failed="Projects did not load."
			empty={{ sentence: `No project is in ${title}.` }}
		>
			<Group
				list={{
					items: projects,
					row: {
						key: (project) => project.name,
						leading: { icon: () => "Folder" },
						title: (project) => project.name,
						meta: (project) => [project.meta],
						trailing: (project) => ({ age: project.age }),
						href: (project) => `#${project.name}`,
					},
				}}
			/>
		</Section>
	);
}

function Projects() {
	return (
		<Place>
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
		</Place>
	);
}
