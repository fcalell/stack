import { Field } from "@base-ui/react/field";
import { Group } from "../../components/group/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Slider } from "../../components/slider/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const change = () => {};

function at(value: number) {
	return (
		<Slider
			label="Lock after idle"
			value={value}
			onChange={change}
			min={0}
			max={60}
			step={5}
			unit="minute"
		/>
	);
}

// The one slider cell: at 30 of 0 to 60 in every state, and at rest also at
// the minimum and the maximum, where the thumb meets the
// track's ends. A disabled slider is drawn inside a disabled field, the way a
// form disables it. Loading draws it waiting beside the loaded one, in a
// Group's card and alone in a Section's body.
export function drawSlider(frame: ShowcaseFrame) {
	if (frame.state === "loading")
		return (
			<Wide>
				<Group>{at(30)}</Group>
				<Group loading>{at(30)}</Group>
				<Section title="Session">{at(30)}</Section>
				<Section title="Session" loading>
					{at(30)}
				</Section>
			</Wide>
		);
	const ends = frame.state === "rest";
	const drawn = (
		<div className="flex flex-col gap-pair w-popover">
			{at(30)}
			{ends ? at(0) : null}
			{ends ? at(60) : null}
		</div>
	);
	if (frame.state === "disabled")
		return <Field.Root disabled>{drawn}</Field.Root>;
	return drawn;
}
