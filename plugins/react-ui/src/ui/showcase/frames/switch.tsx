import { FormField } from "../../components/form-field/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { HeldSwitch } from "../../components/switch/base.tsx";
import { Switch } from "../../components/switch/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { beside, isPaint } from "./painted.tsx";

const change = () => {};

// `SWITCH.state.<value>` and `SWITCH_THUMB.state.<value>` draw the switch
// off or on in every state; `selected` is the on switch alone. A disabled
// switch is a disabled field's (`FormField disabled`, the way a form disables
// it), and a locked row's (a row's `lock`): both are the control's disabled
// form, greyed and `disabled` for assistive tech alike.
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
			<>
				<FormField
					label="Weekly summary"
					disabled
					switch={{ checked: on, onChange: change }}
				/>
				<Section
					title="Retro"
					items={[
						{
							key: "retro",
							label: "Retro",
							meta: ["Runs when you start it"],
							switch: { checked: on, onChange: change },
							lock: "Retro's model is not picked yet.",
						},
					]}
				/>
			</>
		);
	return <div className="flex">{control}</div>;
}
