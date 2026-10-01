import type { Act } from "@fcalell/ui-core/descriptors";
import type { ActionBarFit } from "@fcalell/ui-core/variants";
import { ActionBar } from "../../components/action-bar/index.tsx";
import { TouchedContext } from "../../lib/touched.ts";
import type { ShowcaseFrame } from "../cells.ts";

const change = () => {};
// A touched sheet, so a blocked act shows its reason.
const TOUCHED = { touched: true, touch: change };

interface Drawn {
	fit: ActionBarFit;
	acts: Act[];
	reason: string;
}

const SAVE: Drawn = {
	fit: "end",
	acts: [
		{ label: "Cancel", onAct: change },
		{ label: "Save", onAct: change },
	],
	reason: "Describe the change first.",
};
const CONFIRM: Drawn = {
	fit: "end",
	acts: [
		{ label: "Cancel", onAct: change },
		{ label: "Delete project", onAct: change, destructive: true },
	],
	reason: "Type the project's name first.",
};
const ROW_ACTS: Drawn = {
	fit: "end",
	acts: [
		{ label: "Remove member", onAct: change, destructive: true },
		{ label: "Save", onAct: change },
	],
	reason: "Choose a role first.",
};
const LOGIN: Drawn = {
	fit: "full",
	acts: [{ label: "Continue", onAct: change }],
	reason: "Enter your email address first.",
};

// A sheet's footer by default; the danger cell a confirm's, the destructive
// cell a destructive secondary beside the filled act, the full fit and the
// field fit a login's one act. `loading` draws the filled act pending,
// `disabled` it blocked in a touched sheet with its reason shown.
function drawnOf(cell: string): Drawn {
	if (cell === "BUTTON.act.danger" || cell === "BUTTON_LABEL.act.danger")
		return CONFIRM;
	if (
		cell === "BUTTON.act.destructive" ||
		cell === "BUTTON_LABEL.act.destructive"
	)
		return ROW_ACTS;
	if (cell === "ACTION_BAR.fit.full" || cell === "BUTTON.fit.field")
		return LOGIN;
	return SAVE;
}

export function drawActionBar(frame: ShowcaseFrame) {
	const { fit, acts, reason } = drawnOf(frame.cell.name);
	const last = acts.length - 1;
	const drawn = acts.map((act, at) =>
		at !== last
			? act
			: {
					...act,
					loading: frame.state === "loading",
					blocked: frame.state === "disabled" ? reason : undefined,
				},
	);
	const bar = <ActionBar fit={fit} acts={drawn} />;
	return frame.state === "disabled" ? (
		<TouchedContext value={TOUCHED}>{bar}</TouchedContext>
	) : (
		bar
	);
}
