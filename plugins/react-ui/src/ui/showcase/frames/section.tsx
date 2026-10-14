import { createLeave } from "@fcalell/ui-core/leave";
import { ActionBar } from "../../components/action-bar/index.tsx";
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
import { type Reads, readsAt } from "../waiting.ts";
import {
	STAND_IN_ENTRIES,
	STAND_IN_ROW,
	STAND_INS,
	Wide,
} from "./layout-context.tsx";
import { TURN, TURNS } from "./thread.tsx";

const act = () => {};
const INVITE = { label: "Invite", onAct: act };
const BLOCKED = { ...INVITE, blocked: "Only owners invite." };
// A touched form, so a blocked act shows its reason.
const TOUCHED = { touched: true, touch: act, leave: createLeave() };
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

/** A section whose body is one `Form` of four fields and its bar, loaded and waiting. */
export function Commands(props: { loading?: boolean }) {
	return (
		<Section title="Commands" loading={props.loading}>
			<Form bar={{ acts: [{ label: "Save", onAct: act }] }}>
				<FormField label="Install">
					<Input value="pnpm install" onChange={act} />
				</FormField>
				<FormField label="Build">
					<Input value="pnpm build" onChange={act} />
				</FormField>
				<FormField label="Test">
					<Input value="pnpm test" onChange={act} />
				</FormField>
				<FormField label="Start">
					<Input value="pnpm start" onChange={act} />
				</FormField>
			</Form>
		</Section>
	);
}

/** A section whose body is two fields and a bar, with no `Form`, loaded and waiting. */
export function Profile(props: { loading?: boolean }) {
	return (
		<Section title="Profile" loading={props.loading}>
			<FormField label="Workspace name">
				<Input value="Acme Inc" onChange={act} />
			</FormField>
			<FormField label="Workspace URL">
				<Input value="acme-inc" onChange={act} />
			</FormField>
			<ActionBar acts={[{ label: "Save", onAct: act }]} />
		</Section>
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

const MENU = [
	{ label: "Export members", onAct: act },
	{ label: "Remove all", onAct: act, destructive: true },
];

// A Section over a read still to answer: its description, act and more paint,
// inert, with a body's leaves where they stand; the count is not drawn. The
// first holds the read as its root (it is busy), the second a selection of it.
function Waiting({ reads }: { reads: Reads }) {
	const { waiting } = reads;
	return (
		<Wide>
			<Section
				title="Members"
				count={3}
				description={waiting.at(() => DESCRIPTION)}
				act={waiting.at(() => INVITE)}
				more={waiting.at(() => MENU)}
				read={waiting}
			>
				<Group items={STAND_IN_ENTRIES} />
			</Section>
			<Section
				title="Devices"
				act={{ label: "Add", onAct: act }}
				read={waiting.at((rows) => rows)}
			>
				<Group items={STAND_IN_ENTRIES} />
			</Section>
		</Wide>
	);
}

// A read that fails stands in the body's place with its sentence and Retry,
// and one that answers not found with the missing form; the head stays.
function Failed(props: { first: Reads; second: Reads }) {
	const { missing } = props.first;
	return (
		<Wide>
			<Section title="Members" act={INVITE} read={props.first.failing}>
				<Group items={STAND_IN_ENTRIES} />
			</Section>
			<Section
				title="Members"
				failed="Members did not load."
				read={props.second.failing}
			>
				<Group items={STAND_IN_ENTRIES} />
			</Section>
			<Section title="Members" read={missing}>
				<Group items={STAND_IN_ENTRIES} />
			</Section>
		</Wide>
	);
}

// A read that answers nothing draws the Section's own `empty`, or the generic
// sentence.
function Nothing(props: { first: Reads; second: Reads }) {
	return (
		<Wide>
			<Section
				title="Webhooks"
				read={props.first.empty}
				empty={{
					icon: "Webhook",
					title: "No endpoints",
					sentence: "Add an endpoint to receive an event on each deploy.",
					act: { label: "Add endpoint", onAct: act },
				}}
			/>
			<Section title="Needs you" read={props.second.empty} />
		</Wide>
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
			<Group items={STAND_IN_ENTRIES} />
		</Section>
	);
}

// By state: `disabled` draws the blocked act before it is pressed and in a
// touched form with its reason shown; `loading` the waiting count over a
// Group's and a List's own skeleton rows, a Prose, a Thread and a Code each
// waiting in its own form beside the loaded Section (a List as a waiting QueryBoundary's
// loading form too), a Section over a Form, or over fields and a bar with no Form, whose
// fields and bar each wait in their own form, and a Form's loading group. At rest the cell picks the form: the icon act a
// column's head, the chevron an open and a folded section over a List, the
// destructive act a section over a List whose act removes it, the skeleton cells the loading form, the paint cells a Section over a read that waits (its description, act and more painted, no count), every other cell the section over a Group, then a Section with a description over a Group. The error state draws a read that fails (its Retry, with and without a sentence of its own) and one that answers not found. A Section over a read that answered rows shows their count. An empty section is drawn by its `empty` state: framed with a mark, a title and an act, and the quiet sentence alone, then over a read that answers nothing.
export function drawSection(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const add = { label: "Add", onAct: act };
	const reads = readsAt(frame.id);
	if (frame.state === "error")
		return <Failed first={reads} second={readsAt(`${frame.id}/2`)} />;
	if (frame.state === "empty")
		return (
			<>
				<Nothing first={reads} second={readsAt(`${frame.id}/2`)} />
				<Wide>
					<Section
						title="Webhooks"
						description="Where Acme posts deploy events."
						empty={{
							icon: "Webhook",
							title: "No endpoints",
							sentence:
								"Add an endpoint to receive an event each time a deploy finishes.",
							act: { label: "Add endpoint", onAct: act },
						}}
					/>
					<Section
						title="Needs you"
						empty={{ sentence: "Nothing needs you." }}
					/>
				</Wide>
			</>
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
	if (frame.state === "loading" && cell.startsWith("PAINT"))
		return <Waiting reads={reads} />;
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
					<Group list={{ items: STAND_INS, row: STAND_IN_ROW }} />
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
				<Commands />
				<Commands loading />
				<Profile />
				<Profile loading />
				<Form
					groups={[
						{
							title: "Profile",
							loading: true,
							fields: (
								<>
									<FormField label="Workspace name">
										<Input value="Acme Inc" onChange={act} />
									</FormField>
									<FormField label="Workspace URL">
										<Input value="acme-inc" onChange={act} />
									</FormField>
								</>
							),
						},
					]}
				/>
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
					<Group items={STAND_IN_ENTRIES} />
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
			<Section title="Devices" act={INVITE} read={reads.ready}>
				<Group items={STAND_IN_ENTRIES} />
			</Section>
			<Section title="Memory" description="What the workspace remembers.">
				<Group items={STAND_IN_ENTRIES} />
			</Section>
		</Wide>
	);
}
