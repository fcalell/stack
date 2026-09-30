import type { ButtonAct, ButtonFit } from "@fcalell/ui-core/variants";
import { Button } from "../../components/button/index.tsx";
import { TouchedContext } from "../../lib/touched.ts";
import type { ShowcaseFrame } from "../cells.ts";

const act = () => {};
const LABEL: Record<ButtonAct, string> = {
	primary: "Save",
	danger: "Delete",
	secondary: "Cancel",
	destructive: "Delete",
};
const REASON = "Name the project first.";
// A touched form, so a blocked act shows its reason.
const TOUCHED = { touched: true, touch: act };

// `BUTTON.act.<act>` draws that act at the body fit, `BUTTON.fit.<fit>` the
// primary act at that fit, `ICON.fit.control` the primary act with its
// glyph; `loading` passes `loading`. `disabled` draws the blocked act twice,
// as the board's two columns: before it is pressed, then in a touched form
// with its reason shown. The `BUTTON_LABEL` cells are drawn inside every
// button.
export function drawButton(frame: ShowcaseFrame) {
	const [cell, axis, value] = frame.cell.name.split(".");
	const glyph = cell === "ICON";
	if (cell !== "BUTTON" && !glyph) return undefined;
	const kind = axis === "act" ? (value as ButtonAct) : "primary";
	const fit = !glyph && axis === "fit" ? (value as ButtonFit) : "body";
	const icon = glyph ? "Plus" : undefined;
	const label = glyph ? "New project" : LABEL[kind];
	if (frame.state !== "disabled")
		return (
			<Button
				act={kind}
				fit={fit}
				icon={icon}
				label={label}
				onAct={act}
				loading={frame.state === "loading"}
			/>
		);
	return (
		<>
			<Button act={kind} fit={fit} icon={icon} label={label} blocked={REASON} />
			<TouchedContext value={TOUCHED}>
				<Button
					act={kind}
					fit={fit}
					icon={icon}
					label={label}
					blocked={REASON}
				/>
			</TouchedContext>
		</>
	);
}
