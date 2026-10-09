import { text } from "@fcalell/ui-core/variants";
import { useState } from "react";
import { ActionBar } from "../../components/action-bar/index.tsx";
import { Form } from "../../components/form/index.tsx";
import { ItemHeader } from "../../components/item-header/index.tsx";
import { MessageInput } from "../../components/message-input/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Split } from "../../components/split/index.tsx";
import { Thread } from "../../components/thread/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Labelled } from "./form.tsx";
import { StandInList, StandInRows } from "./layout-context.tsx";
import { Column } from "./place.tsx";
import { TURN, TURNS } from "./thread.tsx";

// The Split in a bleeding Place, whose strip takes the Details act below
// `wide`, on the main cell. `empty` opens nothing, so the main holds the
// empty state; every other frame opens the first record. The record's
// head (no facts line, so a pair above its first section), the empty state
// and the rows are context. The page stands under another view (`up`), whose
// back act leads the strip, or the top bar on touch, while the list stands
// alone and gives way below `tablet` to the record's; the list holds three Sections a sections gap apart. The pane is a long `Form` whose
// bar stays at the pane's end (the Details sheet's below `wide`). The `fills` cell opens
// a conversation: the record's head over a Thread filling the main, its
// `empty` frame a conversation with no message yet.
export function drawSplit(frame: ShowcaseFrame) {
	if (frame.cell.name === "SPLIT_MAIN.state.fills")
		return <Conversation empty={frame.state === "empty"} />;
	if (frame.cell.name !== "SPLIT_MAIN.state.rest") return undefined;
	const empty = frame.state === "empty";
	return (
		<Column>
			<Place title="Issues" bleed up="#">
				<Split
					list={
						<>
							<Section title="Open">
								<StandInList />
							</Section>
							<Section title="In review">
								<StandInList />
							</Section>
							<Section title="Done">
								<StandInList />
							</Section>
						</>
					}
					main={
						empty ? undefined : (
							<>
								<ItemHeader title="Fix invoice rounding" />
								<Section title="Activity">
									<StandInRows ground="list" />
								</Section>
							</>
						)
					}
					pane={<NodeForm />}
					empty={<p className={text({ role: "meta" })}>No issue open</p>}
				/>
			</Place>
		</Column>
	);
}

const noop = () => {};

const FIELDS = [
	["Name", "Review the diff"],
	["Model", "Large, 200k context"],
	["Instruction", "Read the change and list what could break."],
	["Tools", "Search, read file"],
	["Input", "The pull request's diff"],
	["Output", "A list of findings"],
	["Retries", "2"],
	["Timeout", "90 seconds"],
	["On failure", "Stop the run"],
	["Owner", "Ana Ruiz"],
] as const;

// The pane holds a form long enough to scroll, its bar at the pane's end.
function NodeForm() {
	return (
		<Form>
			{FIELDS.map(([label, value]) => (
				<Labelled key={label} label={label} value={value} />
			))}
			<ActionBar
				acts={[
					{ label: "Remove the node", destructive: true, onAct: noop },
					{ label: "Apply", onAct: noop },
				]}
			/>
		</Form>
	);
}

function Conversation(props: { empty: boolean }) {
	const [value, setValue] = useState("");
	return (
		<Column>
			<Place title="Chats" bleed>
				<Split
					list={<StandInList />}
					main={
						<>
							<ItemHeader
								overline={["acme-api"]}
								title="Why did the last deploy of api fail?"
								facts={["Ana Ruiz", "Today"]}
							/>
							<Thread
								items={props.empty ? [] : TURNS}
								empty={{
									title: "Ask about this deploy",
									sentence:
										"Why it failed, or what changed since the last one.",
								}}
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
						</>
					}
					pane={
						<Section title="Session">
							<StandInRows ground="list" />
						</Section>
					}
				/>
			</Place>
		</Column>
	);
}
