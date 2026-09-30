import { Field } from "@base-ui/react/field";
import { Slider } from "../../components/slider/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

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

// The one slider cell: at 30 of 0 to 60 in every state, and at rest and
// under focus also at the minimum and the maximum, where the thumb meets the
// track's ends. A disabled slider is drawn inside a disabled field, the way a
// form disables it.
export function drawSlider(frame: ShowcaseFrame) {
	const ends = frame.state === "rest" || frame.state === "focus";
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
