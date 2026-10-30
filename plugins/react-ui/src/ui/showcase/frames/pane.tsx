import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import type { Option, Run } from "@fcalell/ui-core/descriptors";
import type { Tone } from "@fcalell/ui-core/tokens";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ActionBar } from "../../components/action-bar/index.tsx";
import { Canvas } from "../../components/canvas/index.tsx";
import { MessageInput } from "../../components/message-input/index.tsx";
import { type Fact, Pane } from "../../components/pane/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Place } from "../../components/shell/place.tsx";
import { Text } from "../../components/text/index.tsx";
import { Thread } from "../../components/thread/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { WORKFLOW } from "../graphs.ts";
import {
	type HeldState,
	isHeld,
	type Reads,
	readsAt,
	waiting,
	waitingText,
} from "../waiting.ts";
import { StandInList, StandInRows } from "./layout-context.tsx";
import { isPaint } from "./painted.tsx";
import { ACTIONS, Column, MORE, Opened } from "./place.tsx";
import { TURN, TURNS } from "./thread.tsx";

const act = () => {};
const _SEARCH = [{ icon: "Search" as const, label: "Search", onAct: act }];
const COPY = [
	{ icon: "Copy" as const, label: "Copy URL", onAct: act },
	{ icon: "ExternalLink" as const, label: "Visit", onAct: act },
];

// A Pane that fills (a Canvas, a Thread) needs a Place with a height of its
// own: the page's, in the shell, is the viewport's.
function Tall(props: { children: ReactNode }) {
	return <div className="flex flex-col h-[40rem]">{props.children}</div>;
}

function Issues() {
	return (
		<Pane title="Issues">
			<Section title="Open">
				<StandInList />
			</Section>
			<Section title="In review">
				<StandInList />
			</Section>
			<Section title="Done">
				<StandInList />
			</Section>
		</Pane>
	);
}

function Record() {
	return (
		<Pane title="Fix invoice rounding" back="#">
			<Section title="Activity">
				<StandInRows />
			</Section>
		</Pane>
	);
}

// One Pane: the page, its actions and more on the bar.
function One() {
	return (
		<Place>
			<Pane title="Deploys" actions={ACTIONS} more={MORE}>
				<StandInList />
			</Pane>
		</Place>
	);
}

// Two: the list and the record it opened, whose back act is Close beside the
// list and Back where the record stands alone (below `tablet` of the Place).
function Two() {
	return (
		<Place>
			<Issues />
			<Record />
		</Place>
	);
}

// Three: the record opens a deeper Pane.
function Three() {
	return (
		<Place>
			<Issues />
			<Record />
			<Pane title="Session" back="#">
				<Section title="Details">
					<StandInRows />
				</Section>
			</Pane>
		</Place>
	);
}

// A page short enough that a failure or an empty state centres in what the
// body leaves.
function Short(props: { children: ReactNode }) {
	return (
		<div className="flex flex-col h-[24rem]">
			<Place>{props.children}</Place>
		</div>
	);
}

// A Pane over a read still to answer: its title, actions and more paint, inert,
// the body's leaves paint where they stand, and the docked foot is inert.
function Waiting({ reads }: { reads: Reads }) {
	const { waiting } = reads;
	const [value, setValue] = useState("");
	return (
		<Short>
			<Pane
				title={waiting.at(() => "Deploys")}
				read={waiting}
				actions={ACTIONS.map((one) => waiting.at(() => one))}
				more={waiting.at(() => MORE)}
				foot={
					<MessageInput
						value={value}
						onChange={setValue}
						placeholder="Ask about your deploys"
						onSend={act}
					/>
				}
			>
				<Section title="Recent">
					<StandInList />
				</Section>
			</Pane>
		</Short>
	);
}

// A Pane over a read that holds rows: busy draws the mark after the title,
// stale and paused the line under the bar; the body is the loaded tree.
function Held({ reads, state }: { reads: Reads; state: HeldState }) {
	return (
		<Short>
			<Pane title="Deploys" read={reads[state]} actions={ACTIONS} more={MORE}>
				<Section title="Recent">
					<StandInList />
				</Section>
			</Pane>
		</Short>
	);
}

// A read that fails fills the page with its sentence and Retry, and one that
// answers not found with the missing form and a way back: the generic sentence,
// and the one a `noun` words. A record titled by its failed read keeps its
// place in the bar, and its failed form is the page's heading.
function Failed({ reads }: { reads: Reads }) {
	const { failing, missing } = reads;
	return (
		<>
			<Column>
				<Short>
					<Pane title="Deploys" read={failing}>
						<StandInList />
					</Pane>
				</Short>
			</Column>
			<Column>
				<Short>
					<Pane title="Deploys" back="#" read={missing}>
						<StandInList />
					</Pane>
				</Short>
			</Column>
			<Column>
				<Short>
					<Pane title="Deploy" back="#" noun="deploy" read={missing}>
						<StandInList />
					</Pane>
				</Short>
			</Column>
			<Column>
				<Short>
					<Pane
						title={failing.at(() => NAME)}
						back="#"
						read={failing}
						record={{ within: WITHIN }}
					/>
				</Short>
			</Column>
		</>
	);
}

// The cells a record's head draws, and the cells the missing form draws beyond
// the Pane's own.
const HEAD_CELLS =
	/^(BLOCK_IN|ITEM_|WORD_ACT|STATUS|SPINNER|COUNT|ICON\.fit\.meta|PAINT\.)/;
const MISSING_CELLS = /^(CARD_PART|BUTTON)/;

const move = () => {};

// The states the record moves between, each drawn as its status.
const STATES: Option<Tone>[] = [
	{ value: "waiting", label: "Todo", status: "waiting" },
	{ value: "active", label: "In progress", status: "active" },
	{ value: "attention", label: "Blocked", status: "attention" },
	{ value: "done", label: "Done", status: "done" },
	{ value: "failed", label: "Failed", status: "failed" },
];

const NAME = "Re-run the nightly import";
const WITHIN = "Work · Imports";
const OVERLINE = ["Infra", "ACM-137", "Cycle 14"];
const REST = [{ count: 12, label: "Comments" }, "Ana Ruiz", "Due Oct 4"];

// A head whose reads never answer: its parts and facts stay painted, a status
// and a pick keeping their forms.
const WAITING_OVERLINE: readonly Selection<Run>[] = [waitingText, waitingText];
const WAITING_FACTS: readonly Selection<Fact>[] = [
	waiting.at((): Fact => ({ status: "done" })),
	waiting.at(
		(): Fact => ({
			pick: { label: "Status", options: STATES, onChange: move },
		}),
	),
	waitingText,
	waitingText,
];

function moving(state: Tone) {
	return {
		pick: { label: "Status", options: STATES, value: state, onChange: move },
	};
}

// A record's Pane: the place in the bar, the name and the facts at the body's
// top.
function Head(props: { facts: readonly Fact[] }) {
	return (
		<Column>
			<Short>
				<Pane
					title={NAME}
					back="#"
					record={{ within: WITHIN, overline: OVERLINE, facts: props.facts }}
				/>
			</Short>
		</Column>
	);
}

// The same Pane over parts that never answer.
function HeadWaiting() {
	return (
		<Column>
			<Short>
				<Pane
					title={waitingText}
					back="#"
					record={{
						within: waitingText,
						overline: WAITING_OVERLINE,
						facts: WAITING_FACTS,
					}}
				/>
			</Short>
		</Column>
	);
}

// A record page: the record's name and acts in the Pane's bar, its head under
// it, its act and the sections after them, a sections step apart.
function RecordPage() {
	return (
		<Column>
			<Short>
				<Pane
					title={NAME}
					back="#"
					actions={[{ icon: "Pencil", label: "Edit", onAct: move }]}
					record={{
						within: WITHIN,
						overline: OVERLINE,
						facts: [moving("active"), ...REST],
						// A machine name inside the sentence, boxed in the mono.
						description: [
							"Reads each table from ",
							{ code: "s3://acme-exports/2026" },
							" and lands it in the warehouse.",
						],
					}}
				>
					<ActionBar acts={[{ label: "Pause the import", onAct: move }]} />
					<Section title="Stages">
						<StandInRows />
					</Section>
				</Pane>
			</Short>
		</Column>
	);
}

// Every head cell draws the head in the frame's state: at rest the lines a pair
// apart, the first fact a status that moves; loading the head painted, each
// part and fact a selection still to land, and a paint cell the loaded head
// beside the painted one. A `STATUS_DOT.tone` cell stands on that state. A
// third head carries a fact in words that opens beside one that goes to a
// route, the outlined pills that act, and a status that brings no word of its
// own, a state pill all the same, before the plain facts on their grey.
function Heads(frame: ShowcaseFrame) {
	const [family, , value] = frame.cell.name.split(".");
	// The third segment of a `STATUS_DOT.tone` cell is a state key.
	const state = family === "STATUS_DOT" ? (value as Tone) : "active";
	if (frame.state === "loading") return <HeadWaiting />;
	if (isPaint(frame))
		return frame.state === "rest" ? (
			<>
				<Head facts={[moving("active"), ...REST]} />
				<HeadWaiting />
			</>
		) : undefined;
	return (
		<Opened popup="closed">
			<Head facts={[moving("attention"), ...REST]} />
			<Head facts={[moving(state), ...REST]} />
			<Head
				facts={[
					{ label: "Outside content", onOpen: move },
					{ label: "Open the run", href: "/runs/42" },
					{ status: "done" },
					...REST,
				]}
			/>
			<RecordPage />
		</Opened>
	);
}

// A record long enough to scroll, in a body of its own: on touch the bar's name
// waits until the head's has scrolled up under the bar. `scrolled` scrolls the
// body once its head's name is just under the bar, so the pair draws the bar
// before and after; the bar's name keeps its box in both, only its ink moves.
function Scrolling(props: { scrolled: boolean }) {
	const frame = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!props.scrolled) return;
		// The body is the Pane's one box that scrolls; the head's name sits in it.
		const body = [...(frame.current?.querySelectorAll("div") ?? [])].find(
			(one) => one.scrollHeight > one.clientHeight,
		);
		const name = body?.querySelector("h1, h2");
		if (!body || !name) return;
		body.scrollTop +=
			name.getBoundingClientRect().bottom - body.getBoundingClientRect().top;
	}, [props.scrolled]);
	return (
		<div ref={frame} className="contents">
			<Short>
				<Pane
					title={NAME}
					back="#"
					record={{
						within: WITHIN,
						overline: OVERLINE,
						facts: [moving("active"), ...REST],
					}}
				>
					<Section title="Stages">
						<StandInRows />
					</Section>
					<Section title="Runs">
						<StandInRows />
					</Section>
				</Pane>
			</Short>
		</div>
	);
}

// A Pane over a read that landed: its title from the data, its body a Section
// holding a selection of the same read, whose count is the rows'.
function Ready({ reads }: { reads: Reads }) {
	const { ready } = reads;
	return (
		<Short>
			<Pane
				title={ready.at((rows) => `${rows.length} deploys`)}
				read={ready}
				actions={ACTIONS}
				more={MORE}
			>
				<Section title="Recent" read={ready.at((rows) => rows)}>
					<StandInList />
				</Section>
			</Pane>
		</Short>
	);
}

// A `cover` Pane spans the Place and the one before it is hidden, mounted.
export function Deployment() {
	return (
		<Place>
			<Issues />
			<Pane title="dpl_7Hp9aK" back="#" cover actions={COPY} more={MORE}>
				<Section title="Properties">
					<StandInRows />
				</Section>
			</Pane>
		</Place>
	);
}

// A `wide` Pane holding a Canvas: it fills the Pane, whose content is not held
// to the measure.
function Wide() {
	return (
		<Tall>
			<Place>
				<Pane fill title="Workflow" back="#" wide>
					<Canvas
						label="Steps"
						nodes={WORKFLOW.nodes}
						edges={WORKFLOW.edges}
						groups={WORKFLOW.groups}
					/>
				</Pane>
			</Place>
		</Tall>
	);
}

// A Pane holding a Thread: the Thread fills the Pane, its log scrolling, its
// own foot a sections gap under the log.
function Conversation() {
	const [value, setValue] = useState("");
	return (
		<Tall>
			<Place>
				<Pane title="Chats">
					<StandInList />
				</Pane>
				<Pane fill title="Why did the last deploy of api fail?" back="#">
					<Thread
						items={TURNS}
						message={TURN}
						composer={{
							value,
							onChange: setValue,
							placeholder: "Reply",
							onSend: () => setValue(""),
						}}
					/>
				</Pane>
			</Place>
		</Tall>
	);
}

const NEW_PROJECT = { label: "New project", onAct: act };
const PROJECTS = "A project holds the deploys, domains and logs of one app.";

// A page as tall as the viewport, so an empty Pane's state alone in its body
// centres in what the body leaves.
function Empty(props: { read: Reads["empty"] }) {
	return (
		<div className="flex flex-col h-dvh">
			<Place>
				<Pane
					title="Projects"
					read={props.read}
					empty={{ sentence: PROJECTS, act: NEW_PROJECT }}
				/>
			</Place>
		</div>
	);
}

// A read that answers nothing: the page says so with the Pane's own sentence
// and act, or with the generic sentence.
function Emptied(props: { first: Reads; second: Reads }) {
	return (
		<>
			<Column>
				<Empty read={props.first.empty} />
			</Column>
			<Column>
				<Short>
					<Pane title="Deploys" read={props.second.empty} />
				</Short>
			</Column>
		</>
	);
}

// A Pane whose foot is the ask field, and the same Pane with a task docked in
// its place.
function Tasked() {
	const [value, setValue] = useState("");
	return (
		<Place>
			<Pane
				title="Assistant"
				foot={<MessageInput value={value} onChange={setValue} onSend={act} />}
				sheet={{
					open: true,
					onClose: act,
					title: "Question 1 of 1",
					submit: { label: "Send", onAct: act },
					children: <Text>Who hears about it?</Text>,
				}}
			/>
		</Place>
	);
}

// The cell picks the form; the loading state draws a Pane over a read that
// waits, the error state one over a read that fails and one over a read that
// answers not found, and the empty state draws a Pane over a read that answers
// nothing, with its own sentence and act and with the generic one. The busy,
// stale and paused states draw a Pane over a read that holds rows, on the title
// cell. A head cell draws a record's Pane and a missing-form cell the page of
// a read that answers not found. The title cell draws the Pane's forms in a Place:
// one, two (a list, then its record), three, a covering one, a wide one
// holding a Canvas and one holding a Thread. The bar icon act draws one Pane
// with its more menu open; the body icon act (the touch top bar's) an
// assistant's home under its search act, its ask field docked at its `foot`,
// since the foot draws no matrix cell of its own, and a record's Pane before and
// after its head's name has scrolled up under the bar.
export function drawPane(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const reads = readsAt(frame.id);
	if (
		HEAD_CELLS.test(cell) &&
		(frame.state === "loading" || frame.state === "rest")
	)
		return Heads(frame);
	if (frame.state === "rest" && MISSING_CELLS.test(cell))
		return <Failed reads={reads} />;
	if (frame.state === "loading")
		return (
			<Column>
				<Waiting reads={reads} />
			</Column>
		);
	if (isHeld(frame.state))
		return cell === "TEXT.role.title" ? (
			<Column>
				<Held reads={reads} state={frame.state} />
			</Column>
		) : undefined;
	if (frame.state === "error") return <Failed reads={reads} />;
	if (frame.state === "empty")
		return <Emptied first={reads} second={readsAt(`${frame.id}/2`)} />;
	if (cell === "TEXT.role.title")
		return (
			<>
				<Column>
					<One />
				</Column>
				<Column>
					<Ready reads={reads} />
				</Column>
				<Column>
					<Two />
				</Column>
				<Column>
					<Three />
				</Column>
				<Column>
					<Deployment />
				</Column>
				<Column>
					<Wide />
				</Column>
				<Column>
					<Conversation />
				</Column>
			</>
		);
	if (cell === "TEXT.role.heading")
		return (
			<>
				<Column>
					<Tasked />
				</Column>
				<Column>
					<Scrolling scrolled={false} />
				</Column>
				<Column>
					<Scrolling scrolled />
				</Column>
			</>
		);
	return undefined;
}
