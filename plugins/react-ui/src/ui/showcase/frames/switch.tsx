import { Field } from "@base-ui/react/field";
import { HeldSwitch } from "../../components/switch/base.tsx";
import { Switch } from "../../components/switch/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { beside, isPaint } from "./painted.tsx";

const change = () => {};

// `SWITCH.state.<value>` and `SWITCH_THUMB.state.<value>` draw the switch
// off or on in every state; `selected` is the on switch alone. A disabled
// switch is drawn inside a disabled field, the way a form disables it.
// `PAINT.kind.control` draws the on switch beside its painted form.
export function drawSwitch(frame: ShowcaseFrame) {
	if (isPaint(frame))
		return beside(
			frame,
			<Switch checked onChange={change} label="Weekly summary" />,
			<HeldSwitch checked onChange={change} label="Weekly summary" painted />,
		);
	const on = frame.cell.name.endsWith(".on");
	if (frame.state === "selected" && !on) return undefined;
	const control = (
		<Switch checked={on} onChange={change} label="Weekly summary" />
	);
	// A row, as a settings row holds it, so the hit box keeps its own width.
	if (frame.state === "disabled")
		return (
			<Field.Root disabled className="flex">
				{control}
			</Field.Root>
		);
	return <div className="flex">{control}</div>;
}
