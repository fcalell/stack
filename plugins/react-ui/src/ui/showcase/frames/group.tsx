import { DefinitionRow } from "../../components/definition-row/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { Meter } from "../../components/meter/index.tsx";
import { Slider } from "../../components/slider/index.tsx";
import { Switch } from "../../components/switch/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInRows, Wide } from "./layout-context.tsx";

const noop = () => {};

/** A card of the static parts a waiting Group stands for, one per part: a Meter, a Slider and a DefinitionRow of each form (one line, copyable, a setting that opens, a control). Loaded and waiting draw the same children. */
export function Static(props: { loading?: boolean }) {
	return (
		<Group loading={props.loading}>
			<Meter
				label="Jobs this window"
				value={62}
				max={100}
				meta="Jobs and watches pause at the reserve"
			/>
			<Slider
				label="Reserve"
				value={80}
				onChange={noop}
				min={0}
				max={100}
				step={5}
				unit="percent"
			/>
			<DefinitionRow label="Plan" value="Business" />
			<DefinitionRow label="Workspace ID" value="ws_7f3k9q2m4x" copyable />
			<DefinitionRow
				label="Region"
				description="Where the workspace runs."
				value="Frankfurt"
				href="#region"
			/>
			<DefinitionRow
				label="Notify on failure"
				value={<Switch checked onChange={noop} label="Notify on failure" />}
			/>
		</Group>
	);
}

// Every cell draws the Group in the frame's state: rows at rest, loading its
// static parts waiting beside the loaded card, and stand-in rows no part
// answers for as the three setting rows.
export function drawGroup(frame: ShowcaseFrame) {
	if (frame.state === "loading")
		return (
			<Wide>
				<Static />
				<Static loading />
				<Group loading>
					<StandInRows ground="group" />
				</Group>
			</Wide>
		);
	return (
		<Wide>
			<Group>
				<StandInRows ground="group" />
			</Group>
		</Wide>
	);
}
