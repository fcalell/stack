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
import { StandInList, StandInRows } from "./layout-context.tsx";
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
				<StandInRows ground="list" />
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
					<StandInRows ground="list" />
				</Section>
			</Pane>
		</Place>
	);
}

// A `cover` Pane spans the Place and the one before it is hidden, mounted.
export function Deployment() {
	return (
		<Place>
			<Issues />
			<Pane title="dpl_7Hp9aK" back="#" cover actions={COPY} more={MORE}>
				<Section title="Properties">
					<StandInRows ground="list" />
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
						label="Workflow"
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
					<Group>
						<StandInList />
					</Group>
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
function Empty(props: { children?: ReactNode }) {
	return (
		<div className="flex flex-col h-dvh">
			<Place>
				<Pane
					title="Projects"
					empty={{
						icon: "FolderPlus",
						title: "No projects yet",
						sentence: PROJECTS,
						act: NEW_PROJECT,
						children: props.children,
					}}
				/>
			</Place>
		</div>
	);
}

// The empty state's page form: alone it centres in what the body leaves, and
// with children it stands at the body's top over them.
function Emptied() {
	return (
		<>
			<Column>
				<Empty />
			</Column>
			<Column>
				<Empty>
					<Section
						title="Start from a template"
						description="Each one deploys as is."
					>
						<Group>
							<StandInRows ground="group" />
						</Group>
					</Section>
				</Empty>
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

// The cell picks the form; the empty state draws the empty state's page form
// alone and over children. The title cell draws the Pane's forms in a Place:
// one, two (a list, then its record), three, a covering one, a wide one
// holding a Canvas and one holding a Thread. The bar icon act draws one Pane
// with its more menu open; the body icon act (the touch top bar's) an
// assistant's home under its search act, its ask field docked at its `foot`,
// since the foot draws no matrix cell of its own.
export function drawPane(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (frame.state === "empty") return <Emptied />;
	if (cell === "TEXT.role.title")
		return (
			<>
				<Column>
					<One />
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
