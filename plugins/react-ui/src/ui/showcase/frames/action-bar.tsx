import type { Act } from "@fcalell/ui-core/descriptors";
import type { ActionBarFit } from "@fcalell/ui-core/variants";
import { ActionBar } from "../../components/action-bar/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Column } from "./place.tsx";
import { Publish } from "./table.tsx";

const change = () => {};

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
// Four acts in the narrowest column an end bar stands in above touch: they
// wrap to a further row, the filled act last, and stay inside the column.
const WRAPPED: Act[] = [
	{ label: "Cut the scope in the thread", onAct: change },
	{ label: "Split the work in its thread", onAct: change },
	{ label: "Accept the flags as known limits", onAct: change },
	{ label: "Continue refining", onAct: change },
];
const LOGIN: Drawn = {
	fit: "full",
	acts: [{ label: "Continue", onAct: change }],
	reason: "Enter your email address first.",
};

// A sheet's footer by default; the danger cell a confirm's, the destructive
// cell a destructive secondary beside the filled act, the full fit and the
// field fit a login's one act, the meta cell a selection bar's count over a
// list. `loading` draws the filled act pending, `disabled` it blocked with
// its reason at rest under the acts.
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

/** A bar of two acts loaded, and the bar waiting for one and for two. */
export function Waiting(props: { fit: ActionBarFit }) {
	const { fit } = props;
	return (
		<div className="flex flex-col gap-fields">
			<ActionBar fit={fit} acts={SAVE.acts} />
			<ActionBar fit={fit} acts={[]} loading />
			<ActionBar fit={fit} acts={[]} loading={2} />
		</div>
	);
}

export function drawActionBar(frame: ShowcaseFrame) {
	// The meta cell is the selection count: a publish page's bar docked at
	// its foot, the act pending in `loading` and blocked in `disabled`. A Place
	// with a foot stands in a column of its own height.
	if (frame.cell.name === "TEXT.role.meta") {
		const page = <Publish state={frame.state} />;
		return <Column height="h-185">{page}</Column>;
	}
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
	if (frame.state === "loading")
		return (
			<div className="flex flex-col gap-sections">
				{bar}
				<Waiting fit={fit} />
			</div>
		);
	if (frame.cell.name === "BUTTON.fit.body" && frame.state === "rest")
		return (
			<div className="flex flex-col gap-sections">
				{bar}
				<div className="w-list max-w-full">
					<ActionBar fit="end" acts={WRAPPED} />
				</div>
			</div>
		);
	return bar;
}
