import { Field } from "@base-ui/react/field";
import { Slider } from "../../components/slider/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { waiting } from "../waiting.ts";
import { beside, isPaint } from "./painted.tsx";

const change = () => {};

const never = waiting.at(() => 0);

function at(value: number | typeof never) {
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
// form disables it. `PAINT.kind.control` draws it beside its painted form, a
// value that never arrives.
export function drawSlider(frame: ShowcaseFrame) {
	if (isPaint(frame))
		return beside(
			frame,
			<div className="w-popover">{at(30)}</div>,
			<div className="w-popover">{at(never)}</div>,
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
