import { Field } from "@base-ui/react/field";
import { HeldCheckbox } from "../../components/checkbox/base.tsx";
import { Checkbox } from "../../components/checkbox/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { beside, isPaint } from "./painted.tsx";

const change = () => {};
const VALUES = {
	"CHECKBOX.state.unchecked": false,
	"CHECKBOX.state.checked": true,
	"CHECKBOX.state.mixed": "mixed",
} as const;

// `CHECKBOX.state.<value>` draws the box unchecked, checked or mixed in
// every state; `selected` is the checked and mixed boxes alone. A disabled
// box is drawn inside a disabled field, the way a form disables it.
// `PAINT.kind.control` draws the checked box beside its painted form.
export function drawCheckbox(frame: ShowcaseFrame) {
	if (isPaint(frame))
		return beside(
			frame,
			<Checkbox checked onChange={change} label="Weekly summary" />,
			<HeldCheckbox checked onChange={change} label="Weekly summary" painted />,
		);
	const checked = VALUES[frame.cell.name as keyof typeof VALUES];
	if (checked === undefined) return undefined;
	if (frame.state === "selected" && checked === false) return undefined;
	const control = (
		<Checkbox checked={checked} onChange={change} label="Weekly summary" />
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
