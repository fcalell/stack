import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import type { Option, Part } from "@fcalell/ui-core/descriptors";
import type { StatusState } from "@fcalell/ui-core/tokens";
import { ActionBar } from "../../components/action-bar/index.tsx";
import type { Fact } from "../../components/item-header/index.tsx";
import { ItemHeader } from "../../components/item-header/index.tsx";
import { Pane } from "../../components/pane/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { waiting, waitingText } from "../waiting.ts";
import { StandInRows, Wide } from "./layout-context.tsx";
import { isPaint } from "./painted.tsx";
import { Column, Opened } from "./place.tsx";

const move = () => {};

// A head whose reads never answer: its parts and facts stay painted, a status
// and a pick keeping their forms.
const WAITING_OVERLINE: readonly Selection<Part>[] = [waitingText, waitingText];
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

// The states the record moves between, each drawn as its status.
const STATES: Option<StatusState>[] = [
	{ value: "waiting", label: "Todo", status: "waiting" },
	{ value: "active", label: "In progress", status: "active" },
	{ value: "attention", label: "Blocked", status: "attention" },
	{ value: "done", label: "Done", status: "done" },
	{ value: "failed", label: "Failed", status: "failed" },
];

const OVERLINE = ["Infra", "ACM-137", "Cycle 14"];
const REST = [{ count: 12, label: "Comments" }, "Ana Ruiz", "Due Oct 4"];

function moving(state: StatusState) {
	return {
		pick: { label: "Status", options: STATES, value: state, onChange: move },
	};
}

// A record page: the record's name and acts in the Pane's bar, its head under
// it, its act and the sections after them, a sections step apart.
function Record() {
	return (
		<Column>
			<Place>
				<Pane
					title="Re-run the nightly import"
					actions={[{ icon: "Pencil", label: "Edit", onAct: move }]}
				>
					<ItemHeader overline={OVERLINE} facts={[moving("active"), ...REST]} />
					<ActionBar acts={[{ label: "Pause the import", onAct: move }]} />
					<Section title="Stages">
						<StandInRows />
					</Section>
				</Pane>
			</Place>
		</Column>
	);
}

// Every cell draws the head in the frame's state: at rest the lines a pair
// apart, the first fact a status that moves; loading the head painted, each
// part and fact a selection still to land, and a paint cell the loaded head
// beside it. A `STATUS_DOT.state` cell stands on that state. A third head carries a fact in words that opens
// beside one that goes to a route; a record page holds a head under the
// Pane's bar, which names the record and holds its acts, with its act under it.
export function drawItemHeader(frame: ShowcaseFrame) {
	const [family, , value] = frame.cell.name.split(".");
	// The third segment of a `STATUS_DOT.state` cell is a state key.
	const state = family === "STATUS_DOT" ? (value as StatusState) : "active";
	const painted = (
		<ItemHeader overline={WAITING_OVERLINE} facts={WAITING_FACTS} />
	);
	if (isPaint(frame))
		return frame.state === "rest" ? (
			<Wide>
				<ItemHeader overline={OVERLINE} facts={[moving("active"), ...REST]} />
				{painted}
			</Wide>
		) : undefined;
	if (frame.state === "loading") return <Wide>{painted}</Wide>;
	return (
		<Opened popup="closed">
			<Wide>
				<ItemHeader
					overline={OVERLINE}
					facts={[moving("attention"), ...REST]}
				/>
				<ItemHeader overline={OVERLINE} facts={[moving(state), ...REST]} />
				<ItemHeader
					overline={OVERLINE}
					facts={[
						{ label: "Outside content", onOpen: move },
						{ label: "Open the run", href: "/runs/42" },
						...REST,
					]}
				/>
			</Wide>
			<Record />
		</Opened>
	);
}
