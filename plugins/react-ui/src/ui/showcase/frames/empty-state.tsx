import type { ReactNode } from "react";
import { Button } from "../../components/button/index.tsx";
import { EmptyState } from "../../components/empty-state/index.tsx";
import { Failed } from "../../components/failed/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInRows } from "./layout-context.tsx";
import { Column } from "./place.tsx";

const act = () => {};
const NEW_PROJECT = { label: "New project", onAct: act };
const PROJECTS = "A project holds the deploys, domains and logs of one app.";

// A page as tall as the viewport, so an EmptyState alone in its body
// centres in what the body leaves.
function Tall(props: { title: string; children: ReactNode }) {
	return (
		<div className="flex flex-col h-dvh">
			<Place title={props.title}>{props.children}</Place>
		</div>
	);
}

function Page(props: { children: ReactNode }) {
	return (
		<Column>
			<Tall title="Projects">{props.children}</Tall>
		</Column>
	);
}

// Each form on the cells it draws: the title roles pick the form (heading
// a page, body 500 a Section, title a first run), the act's kind and fit
// follow; the meta role draws the page form over its children.
export function drawEmptyState(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (
		cell === "TEXT.role.body" ||
		cell === "TEXT_STRONG.role.body" ||
		cell === "BUTTON.act.secondary" ||
		cell === "BUTTON_LABEL.act.secondary"
	)
		return (
			<Column>
				<Place title="Settings">
					<Section
						title="Webhooks"
						description="Where Acme posts deploy events."
					>
						<EmptyState
							icon="Webhook"
							title="No endpoints"
							sentence="Add an endpoint to receive an event each time a deploy finishes."
							act={{ label: "Add endpoint", onAct: act }}
						/>
					</Section>
				</Place>
			</Column>
		);
	if (cell === "TEXT.role.title" || cell === "BUTTON.fit.body")
		return (
			<div className="flex flex-col items-center justify-center p-sections bg-canvas w-screen max-w-full">
				<EmptyState
					icon="Rocket"
					title="Deploy your first app"
					sentence="Connect a repository and Acme builds and deploys every push to main."
					act={{ label: "Connect a repository", onAct: act }}
				>
					<Button act="secondary" label="Start from a template" onAct={act} />
				</EmptyState>
			</div>
		);
	if (cell === "TEXT.role.meta")
		return (
			<Page>
				<EmptyState
					icon="FolderPlus"
					title="No projects yet"
					sentence={PROJECTS}
					act={NEW_PROJECT}
				>
					<Section
						title="Start from a template"
						description="Each one deploys as is."
					>
						<Group>
							<StandInRows ground="group" />
						</Group>
					</Section>
				</EmptyState>
			</Page>
		);
	// The create form over the failed one, each alone on a page of its own: the
	// filled act with the plus beside the hairline one without.
	return (
		<Column>
			<Tall title="Projects">
				<EmptyState
					icon="FolderPlus"
					title="No projects yet"
					sentence={PROJECTS}
					act={NEW_PROJECT}
				/>
			</Tall>
			<Tall title="Deploys">
				<Failed
					sentence="Deploys did not load."
					act={{ label: "Retry", onAct: act }}
				/>
			</Tall>
		</Column>
	);
}
