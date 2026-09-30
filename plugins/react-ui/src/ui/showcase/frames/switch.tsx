import { Field } from "@base-ui/react/field";
import { Switch } from "../../components/switch/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

const change = () => {};

// `SWITCH.state.<value>` and `SWITCH_THUMB.state.<value>` draw the switch
// off or on in every state; `selected` is the on switch alone. A disabled
// switch is drawn inside a disabled field, the way a form disables it.
export function drawSwitch(frame: ShowcaseFrame) {
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
