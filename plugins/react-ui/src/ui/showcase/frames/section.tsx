import { Code } from "../../components/code/index.tsx";
import { Form } from "../../components/form/index.tsx";
import { FormField } from "../../components/form-field/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { List } from "../../components/list/index.tsx";
import { Prose } from "../../components/prose/index.tsx";
import {
	QueryBoundary,
	type QueryLike,
} from "../../components/query-boundary/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Thread } from "../../components/thread/index.tsx";
import { TouchedContext } from "../../lib/touched.ts";
import type { ShowcaseFrame } from "../cells.ts";
import { Labelled } from "./form.tsx";
import {
	STAND_IN_ROW,
	STAND_INS,
	StandInRows,
	Wide,
} from "./layout-context.tsx";
import { TURN, TURNS } from "./thread.tsx";

const act = () => {};
const INVITE = { label: "Invite", onAct: act };
const BLOCKED = { ...INVITE, blocked: "Only owners invite." };
// A touched form, so a blocked act shows its reason.
const TOUCHED = { touched: true, touch: act };
const DESCRIPTION = "People who can open this workspace.";
// An app's own component around a List and a settled query a QueryBoundary
// reads: in a loading Section each waits as rows, however deep its List.
const PENDING: QueryLike<typeof STAND_INS> = {
	data: undefined,
	isPending: true,
	isError: false,
	refetch: act,
};

// A body that is no field and no rows, as loaded and as waiting: each part draws
// its own waiting form in a loading Section.
const NOTES =
	"Moves the billing webhooks off the legacy queue. Each event is acknowledged once its handler commits, so a retry never charges twice.";
const CHECK = Array.from(
	{ length: 8 },
	(_, line) => `step ${line + 1} ok`,
).join("\n");

export function Bodies(props: { loading?: boolean }) {
	const { loading } = props;
	return (
		<>
			<Section title="Notes" loading={loading}>
				<Prose markdown={NOTES} />
			</Section>
			<Section title="Thread" loading={loading}>
				<Thread items={TURNS.slice(0, 3)} message={TURN} />
			</Section>
			<Section title="Check" loading={loading}>
				<Code text={CHECK} tail={3} />
			</Section>
		</>
	);
}

/** A head with its description, loaded and waiting for it (`description=""`). */
export function Described(props: { loading?: boolean }) {
	return (
		<Section
			title="Check"
			description={props.loading ? "" : "Passed on 6dbf0da"}
			loading={props.loading}
		/>
	);
}

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

// By state: `disabled` draws the blocked act before it is pressed and in a
// touched form with its reason shown; `loading` the waiting count over a
// Group's and a List's own skeleton rows, a Prose, a Thread and a Code each
// waiting in its own form beside the loaded Section (a List as a waiting QueryBoundary's
// loading form too), and the section's skeleton fields standing in
// for a body of fields in a Form. At rest the cell picks the form: the icon act a
// column's head, `SECTION.in.form` a section of fields in a Form, the chevron an open and a folded section over a List, the
// destructive act a section over a List whose act removes it, the skeleton cells the loading form, every other cell the section over a Group.
export function drawSection(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const add = { label: "Add", onAct: act };
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
				<Section
					title="Members"
					count={3}
					description={DESCRIPTION}
					act={INVITE}
					loading
				>
					<Group>
						<StandInRows ground="group" />
					</Group>
				</Section>
				<Section title="In progress" folded={false} act={add} loading>
					<List items={STAND_INS} row={STAND_IN_ROW} />
				</Section>
				<Section title="Recent" loading>
					<QueryBoundary
						query={PENDING}
						sentence="Recent members did not load."
						loading={<List items={[]} loading row={STAND_IN_ROW} />}
					>
						{(names) => <List items={names} row={STAND_IN_ROW} />}
					</QueryBoundary>
				</Section>
				<Bodies />
				<Bodies loading />
				<Described />
				<Described loading />
				<Form>
					<Section title="Profile" loading>
						<FormField label="Workspace name">
							<Input value="Acme Inc" onChange={act} />
						</FormField>
						<FormField label="Workspace URL">
							<Input value="acme-inc" onChange={act} />
						</FormField>
					</Section>
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
					act={{ label: "Delete all", onAct: act, destructive: true }}
				>
					<List items={STAND_INS} row={STAND_IN_ROW} />
				</Section>
			</Wide>
		);
	if (cell === "ICON.fit.body")
		return (
			<Wide>
				<Section title="In progress" folded={false} act={add}>
					<List items={STAND_INS} row={STAND_IN_ROW} />
				</Section>
				<Section title="Done" count={11} folded act={add}>
					<List items={STAND_INS} row={STAND_IN_ROW} />
				</Section>
			</Wide>
		);
	return (
		<Wide>
			<Members />
		</Wide>
	);
}
