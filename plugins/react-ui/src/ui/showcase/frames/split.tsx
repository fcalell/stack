import { text } from "@fcalell/ui-core/variants";
import { useState } from "react";
import { ItemHeader } from "../../components/item-header/index.tsx";
import { MessageInput } from "../../components/message-input/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Split } from "../../components/split/index.tsx";
import { Thread } from "../../components/thread/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInList, StandInRows } from "./layout-context.tsx";
import { Column } from "./place.tsx";
import { TURN, TURNS } from "./thread.tsx";

// The Split in a bleeding Place, whose strip takes the Details act below
// `wide`, on the main cell. `empty` opens nothing, so the main holds the
// empty state; every other frame opens the first record. The record's
// heading, the empty state and the rows are context; the list holds three
// Sections a sections gap apart. The `fills` cell opens
// a conversation: the record's head over a Thread filling the main, its
// `empty` frame a conversation with no message yet.
export function drawSplit(frame: ShowcaseFrame) {
	if (frame.cell.name === "SPLIT_MAIN.state.fills")
		return <Conversation empty={frame.state === "empty"} />;
	if (frame.cell.name !== "SPLIT_MAIN.state.rest") return undefined;
	const empty = frame.state === "empty";
	return (
		<Column>
			<Place title="Issues" bleed>
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
								<h2 className={text({ role: "heading" })}>
									Fix invoice rounding
								</h2>
								<Section title="Activity">
									<StandInRows ground="list" />
								</Section>
							</>
						)
					}
					pane={
						<Section title="Properties">
							<StandInRows ground="list" />
						</Section>
					}
					empty={<p className={text({ role: "meta" })}>No issue open</p>}
				/>
			</Place>
		</Column>
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
