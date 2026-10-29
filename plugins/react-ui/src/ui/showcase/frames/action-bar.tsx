import type { Act } from "@fcalell/ui-core/descriptors";
import { type ActionBarFit, GATE_COLUMN } from "@fcalell/ui-core/variants";
import { ActionBar } from "../../components/action-bar/index.tsx";
import { Text } from "../../components/text/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { fail, hang, Pressed } from "./pending.tsx";
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
// A sign-in column's two ways in: at every density one a row, the filled act
// first.
const LOGIN: Drawn = {
	fit: "full",
	acts: [
		{ label: "Use a recovery code", onAct: change },
		{ label: "Continue with email", onAct: change },
	],
	reason: "Enter your email address first.",
};

// A sheet's footer by default; the danger cell a confirm's, the destructive
// cell a destructive secondary beside the filled act, the full fit and the
// field fit a login column's two ways in, the meta cell a selection bar's count over a
// list. `pending` presses the filled act into one that never settles, `error`
// into one the server refuses (its sentence in the bar's kept line, the act
// ready again), `disabled` it blocked with its reason at rest under the acts. A bar whose data is not here paints in a
// Form's or a Sheet's drawer, where the frame's read waits.
function drawnOf(cell: string): Drawn {
	if (cell === "BUTTON.act.danger" || cell === "BUTTON_LABEL.act.danger")
		return CONFIRM;
	if (
		cell === "BUTTON.act.destructive" ||
		cell === "BUTTON_LABEL.act.destructive"
	)
		return ROW_ACTS;
	if (cell === "BUTTON.fit.field") return LOGIN;
	return SAVE;
}

const PENDING = { sentence: "Merging the change" };
// A bar of one, two and three acts, each swapped for its pending form.
const SWAPPED: Act[][] = [
	[{ label: "Merge", onAct: change }],
	[
		{ label: "Close", onAct: change },
		{ label: "Merge", onAct: change },
	],
	[
		{ label: "Decline", onAct: change, destructive: true },
		{ label: "Close", onAct: change },
		{ label: "Merge", onAct: change },
	],
];

// A bar of `acts` loaded and the same bar pending, a line below each so the
// swap's shift shows.
function Swapped(props: { acts: Act[] }) {
	const { acts } = props;
	return (
		<div className="flex flex-col gap-section">
			<div data-swap="loaded" className="flex flex-col">
				<ActionBar acts={acts} />
				<Text role="meta">Below the bar</Text>
			</div>
			<div data-swap="pending" className="flex flex-col">
				<ActionBar acts={acts} pending={PENDING} />
				<Text role="meta">Below the bar</Text>
			</div>
		</div>
	);
}

// The swap for a bar of one, two and three acts and for the four-act bar that wraps.
function Swaps() {
	return (
		<>
			{SWAPPED.map((acts) => (
				<Swapped key={acts.length} acts={acts} />
			))}
			<div className="w-list max-w-full">
				<Swapped acts={WRAPPED} />
			</div>
		</>
	);
}

export function drawActionBar(frame: ShowcaseFrame) {
	// The meta cell is the selection count: a publish page's bar docked at
	// its foot, the act pending in `pending` and blocked in `disabled`.
	if (frame.cell.name === "TEXT.role.meta") {
		const page = <Publish state={frame.state} />;
		return <Column>{page}</Column>;
	}
	const { fit, acts, reason } = drawnOf(frame.cell.name);
	const last = acts.length - 1;
	const drawn = acts.map((act, at) =>
		at !== last
			? act
			: {
					...act,
					onAct:
						frame.state === "pending"
							? hang
							: frame.state === "error"
								? fail
								: act.onAct,
					failed: "That change could not be saved.",
					blocked: frame.state === "disabled" ? reason : undefined,
				},
	);
	const bar =
		fit === "full" ? (
			<div className={GATE_COLUMN}>
				<ActionBar fit={fit} acts={drawn} />
			</div>
		) : (
			<ActionBar fit={fit} acts={drawn} />
		);
	if (frame.state === "pending" || frame.state === "error")
		return <Pressed label={acts[last]?.label}>{bar}</Pressed>;
	if (frame.cell.name === "BUTTON.fit.body" && frame.state === "rest")
		return (
			<div className="flex flex-col gap-section">
				{bar}
				<div className="w-list max-w-full">
					<ActionBar fit="end" acts={WRAPPED} />
				</div>
				<Swaps />
			</div>
		);
	return bar;
}
