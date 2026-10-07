import { createLeave } from "@fcalell/ui-core/leave";
import type { ButtonAct, ButtonFit } from "@fcalell/ui-core/variants";
import { Button, type ButtonProps } from "../../components/button/index.tsx";
import { TouchedContext } from "../../lib/touched.ts";
import type { ShowcaseFrame } from "../cells.ts";

const act = () => {};
const LABEL: Record<ButtonAct, string> = {
	primary: "Save",
	danger: "Delete",
	secondary: "Cancel",
	quiet: "Resend",
	destructive: "Delete",
};
const REASON = "Name the project first.";
// A touched form, so a blocked act shows its reason.
const TOUCHED = { touched: true, touch: act, leave: createLeave() };
// The count cell: a secondary act in a bar with its count after the label.
const COUNTED: ButtonProps = {
	act: "secondary",
	fit: "bar",
	icon: "ListFilter",
	label: "Filter",
	count: 2,
};

// `BUTTON.act.<act>` draws that act at the body fit, `BUTTON.fit.<fit>` the
// primary act at that fit, `ICON.fit.control` the primary act with its
// glyph; `BUTTON.fit.bar` adds the counted act beside it (the `COUNT` cells);
// `loading` passes `loading`. `disabled` draws the blocked act twice, as the
// board's two columns: before it is pressed, then in a touched form with its
// reason shown. The `BUTTON_LABEL` cells are drawn inside every button.
export function drawButton(frame: ShowcaseFrame) {
	const [cell, axis, value] = frame.cell.name.split(".");
	const glyph = cell === "ICON";
	if (cell !== "BUTTON" && !glyph) return undefined;
	const kind = axis === "act" ? (value as ButtonAct) : "primary";
	const fit = !glyph && axis === "fit" ? (value as ButtonFit) : "body";
	const own: ButtonProps = {
		act: kind,
		fit,
		icon: glyph ? "Plus" : undefined,
		label: glyph ? "New project" : LABEL[kind],
	};
	const acts = fit === "bar" ? [own, COUNTED] : [own];
	if (frame.state !== "disabled")
		return (
			<>
				{acts.map((props) => (
					<Button
						key={props.label}
						{...props}
						onAct={act}
						loading={frame.state === "loading"}
					/>
				))}
			</>
		);
	return (
		<>
			{acts.map((props) => (
				<Button key={props.label} {...props} blocked={REASON} />
			))}
			<TouchedContext value={TOUCHED}>
				{acts.map((props) => (
					<Button key={props.label} {...props} blocked={REASON} />
				))}
			</TouchedContext>
		</>
	);
}
