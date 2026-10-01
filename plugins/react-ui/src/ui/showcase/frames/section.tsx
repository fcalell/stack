import { Form } from "../../components/form/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { List } from "../../components/list/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { TouchedContext } from "../../lib/touched.ts";
import type { ShowcaseFrame } from "../cells.ts";
import { Labelled } from "./form.tsx";
import { StandInRows, Wide } from "./layout-context.tsx";

const act = () => {};
const INVITE = { label: "Invite", onAct: act };
const BLOCKED = { ...INVITE, blocked: "Only owners invite." };
// A touched form, so a blocked act shows its reason.
const TOUCHED = { touched: true, touch: act };
const DESCRIPTION = "People who can open this workspace.";

function Members(props: { blocked?: boolean }) {
	return (
		<Section
			title="Members"
			count={3}
			description={DESCRIPTION}
			act={props.blocked ? BLOCKED : INVITE}
		>
			<Group>
				<StandInRows ground="group" />
			</Group>
		</Section>
	);
}

// By state: the pointer and focus states force the fold toggle of a folded
// section; `disabled` draws the blocked act before it is pressed and in a
// touched form with its reason shown; `loading` the waiting count over a
// Group's and a List's own skeleton rows, and the section's skeleton fields
// standing in for a body of fields in a Form. At rest the cell picks the form: the icon act a
// column's head, `SECTION.in.form` a section of fields in a Form, the chevron an open and a folded section over a List, the
// destructive act a section over a List whose act removes it, the skeleton cells the loading form, every other cell the section over a Group.
export function drawSection(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const add = { label: "Add", onAct: act };
	if (
		frame.state === "hover" ||
		frame.state === "focus" ||
		frame.state === "active"
	)
		return (
			<Wide>
				<Section title="Done" count={11} folded onToggle={act}>
					<List>
						<StandInRows ground="list" />
					</List>
				</Section>
			</Wide>
		);
	if (frame.state === "disabled")
		return (
			<Wide>
				<Members blocked />
				<TouchedContext value={TOUCHED}>
					<Members blocked />
				</TouchedContext>
			</Wide>
		);
	if (frame.state === "loading" || cell.startsWith("SKELETON"))
		return (
			<Wide>
				<Section title="Members" description={DESCRIPTION} act={INVITE} loading>
					<Group>
						<StandInRows ground="group" />
					</Group>
				</Section>
				<Section title="In progress" folded={false} act={add} loading>
					<List>
						<StandInRows ground="list" />
					</List>
				</Section>
				<Form>
					<Section title="Profile" loading />
				</Form>
			</Wide>
		);
	if (cell === "SECTION.in.form")
		return (
			<Wide>
				<Form>
					<Section
						title="General"
						description="How the workspace appears to its members."
					>
						<Labelled label="Workspace name" value="Acme Inc" />
						<Labelled label="Workspace URL" value="acme-inc" />
					</Section>
				</Form>
			</Wide>
		);
	if (cell === "ICON_BUTTON.fit.bar")
		return (
			<Wide>
				<Section
					title="Todo"
					count={3}
					act={{ icon: "Plus", label: "New issue in Todo", onAct: act }}
				>
					<Group>
						<StandInRows ground="group" />
					</Group>
				</Section>
			</Wide>
		);
	if (cell.endsWith(".act.destructive"))
		return (
			<Wide>
				<Section
					title="Archived"
					count={3}
					act={{ label: "Delete all", onAct: act, destructive: true }}
				>
					<List>
						<StandInRows ground="list" />
					</List>
				</Section>
			</Wide>
		);
	if (cell === "ICON.fit.body")
		return (
			<Wide>
				<Section title="In progress" count={3} folded={false} act={add}>
					<List>
						<StandInRows ground="list" />
					</List>
				</Section>
				<Section title="Done" count={11} folded act={add}>
					<List>
						<StandInRows ground="list" />
					</List>
				</Section>
			</Wide>
		);
	return (
		<Wide>
			<Members />
		</Wide>
	);
}
