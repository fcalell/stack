import { type ReactNode, useState } from "react";
import { Canvas } from "../../components/canvas/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { MessageInput } from "../../components/message-input/index.tsx";
import { Pane } from "../../components/pane/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Text } from "../../components/text/index.tsx";
import { Thread } from "../../components/thread/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { WORKFLOW } from "../graphs.ts";
import { type HeldState, isHeld, type Reads, readsAt } from "../waiting.ts";
import {
	STAND_IN_ROW,
	STAND_INS,
	StandInList,
	StandInRows,
} from "./layout-context.tsx";
import { ACTIONS, Column, MORE, Opened } from "./place.tsx";
import { TURN, TURNS } from "./thread.tsx";

const act = () => {};
const SEARCH = [{ icon: "Search" as const, label: "Search", onAct: act }];
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
// answers not found with the missing form and a way back.
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
		</>
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
				<Pane title="Workflow" back="#" wide>
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
				<Pane title="Why did the last deploy of api fail?" back="#">
					<Thread
						items={TURNS}
						message={TURN}
						foot={
							<MessageInput
								value={value}
								onChange={setValue}
								placeholder="Reply"
								onSend={() => setValue("")}
							/>
						}
					/>
				</Pane>
			</Place>
		</Tall>
	);
}

// An assistant's home: its sections scrolling under the ask field docked at
// the Pane's `foot`, the latest exchange inline in the last section.
function Home() {
	const [value, setValue] = useState("");
	return (
		<Place>
			<Pane
				title="Home"
				actions={SEARCH}
				foot={
					<MessageInput
						value={value}
						onChange={setValue}
						onAttach={act}
						placeholder="Ask about your deploys"
						onSend={() => setValue("")}
					/>
				}
			>
				<Section title="Tasks">
					<Group list={{ items: STAND_INS, row: STAND_IN_ROW }} />
				</Section>
				<Section title="Latest">
					<Thread items={TURNS.slice(-2)} message={TURN} />
				</Section>
			</Pane>
		</Place>
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
// cell. The title cell draws the Pane's forms in a Place:
// one, two (a list, then its record), three, a covering one, a wide one
// holding a Canvas and one holding a Thread. The bar icon act draws one Pane
// with its more menu open; the body icon act (the touch top bar's) an
// assistant's home under its search act, its ask field docked at its `foot`,
// since the foot draws no matrix cell of its own.
export function drawPane(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const reads = readsAt(frame.id);
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
			<Column>
				<Tasked />
			</Column>
		);
	if (cell === "ICON_BUTTON.fit.body")
		return (
			<Column>
				<Home />
			</Column>
		);
	if (cell === "ICON_BUTTON.fit.bar")
		return (
			<Opened>
				<Column>
					<One />
				</Column>
			</Opened>
		);
	return undefined;
}
