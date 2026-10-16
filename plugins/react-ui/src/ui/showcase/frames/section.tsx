import { createLeave } from "@fcalell/ui-core/leave";
import { Group } from "../../components/group/index.tsx";
import { List } from "../../components/list/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { TouchedContext } from "../../lib/touched.ts";
import type { ShowcaseFrame } from "../cells.ts";
import { type HeldState, isHeld, type Reads, readsAt } from "../waiting.ts";
import {
	STAND_IN_ENTRIES,
	STAND_IN_ROW,
	STAND_INS,
	Wide,
} from "./layout-context.tsx";

const act = () => {};
const INVITE = { label: "Invite", onAct: act };
const BLOCKED = { ...INVITE, blocked: "Only owners invite." };
// A touched form, so a blocked act shows its reason.
const TOUCHED = { touched: true, touch: act, leave: createLeave() };
const DESCRIPTION = "People who can open this workspace.";
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

// A Section over a read that holds rows: busy draws the mark after the title,
// stale and paused the line under the head; the body is the loaded tree.
function Held({ reads, state }: { reads: Reads; state: HeldState }) {
	return (
		<Wide>
			<Section title="Members" count={3} act={INVITE} read={reads[state]}>
				<Group items={STAND_IN_ENTRIES} />
			</Section>
		</Wide>
	);
}

// A read that fails stands in the body's place with its sentence and Retry,
// and one that answers not found with the missing form; the head stays, its
// description over the ended read drawing nothing.
function Failed(props: { first: Reads; second: Reads }) {
	const { missing, failing } = props.first;
	return (
		<Wide>
			<Section
				title="Members"
				description={failing.at(() => DESCRIPTION)}
				act={INVITE}
				read={failing}
			>
				<Group items={STAND_IN_ENTRIES} />
			</Section>
			<Section title="Members" read={props.second.failing}>
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
// touched form with its reason shown; `loading` a Section over a read that
// waits (its description, act and more painted, no count). At rest the cell
// picks the form: the icon act a column's head, the chevron an open and a
// folded section over a List, the destructive act a section over a List whose
// act removes it, every other cell the section over a Group, then a Section
// with a description over a Group. The error state draws a read that fails
// (its Retry, with and without a sentence of its own) and one that answers not
// found. A Section over a read that answered rows shows their count. An empty
// section is drawn by its `empty` state: framed with an act, and the
// quiet sentence alone, then over a read that answers nothing.
// The busy, stale and paused states draw a Section over a read that holds
// rows, on the heading cell.
export function drawSection(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const add = { label: "Add", onAct: act };
	const reads = readsAt(frame.id);
	if (isHeld(frame.state))
		return cell === "TEXT.role.heading" ? (
			<Held reads={reads} state={frame.state} />
		) : undefined;
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
						read={readsAt(`${frame.id}/3`).empty}
						empty={{
							sentence:
								"Add an endpoint to receive an event each time a deploy finishes.",
							act: { label: "Add endpoint", onAct: act },
						}}
					/>
					<Section
						title="Needs you"
						read={readsAt(`${frame.id}/4`).empty}
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
	if (frame.state === "loading") return <Waiting reads={reads} />;
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
