import type { StatusMark } from "@fcalell/ui-core/descriptors";
import {
	Comparison,
	type FactSlots,
} from "../../components/comparison/index.tsx";
import { Section } from "../../components/section/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { itemsAt } from "../waiting.ts";
import { Wide } from "./layout-context.tsx";
import { isPaint } from "./painted.tsx";

interface Fact {
	label: string;
	values: string[];
}

// A plan's fact carries a chip: the plans declare `chips`, so every fact
// fills it.
interface PlanFact extends Fact {
	chips: string[];
}

// Board 51's plan change (two columns) and plans (three, each fact with a
// chip).
const CHANGE: Fact[] = [
	{ label: "Plan", values: ["Team", "Business"] },
	{ label: "Seats", values: ["10", "25"] },
	{ label: "Storage", values: ["100 GB", "1 TB"] },
	{ label: "Audit log", values: ["Not included", "Kept 90 days"] },
	{
		label: "Billed",
		values: ["$120 a month", "$480 a month, from 14 October"],
	},
];
const PLANS: PlanFact[] = [
	{ label: "Seats", values: ["3", "10", "Unlimited"], chips: ["Changed"] },
	{
		label: "Projects",
		values: ["2", "Unlimited", "Unlimited"],
		chips: ["Changed"],
	},
	{ label: "Single sign-on", values: ["No", "No", "Yes"], chips: ["Beta"] },
	{
		label: "History",
		values: ["7 days", "90 days", "Forever"],
		chips: ["New"],
	},
	{
		label: "Support",
		values: ["Community", "Email", "Email and chat, same day"],
		chips: ["New"],
	},
];

// A data layer's fact carries its verdict: a failing fact says what is wrong
// with it, a passing one is read out as matching, and one more draws none.
interface LayerFact extends Fact {
	verdict?: StatusMark;
}

// A spec beside what was observed, field by field.
const LAYER: LayerFact[] = [
	{
		label: "plan",
		values: ["string", "string"],
		verdict: { state: "done", label: "Matches" },
	},
	{
		label: "seats",
		values: ["number", "string"],
		verdict: { state: "failed", label: "Wrong type" },
	},
	{
		label: "trial_ends",
		values: ["date", "Not observed"],
		verdict: { state: "failed", label: "Missing" },
	},
	{
		label: "currency",
		values: ["USD", "usd"],
		verdict: { state: "attention", label: "Differs" },
	},
	{ label: "workspace_id", values: ["uuid", "uuid"] },
];

const ROW = {
	key: (fact: Fact) => fact.label,
	label: (fact: Fact) => fact.label,
	values: (fact: Fact) => fact.values,
};
const PLAN_ROW: FactSlots<PlanFact> = { ...ROW, chips: (fact) => fact.chips };
const LAYER_ROW: FactSlots<LayerFact> = {
	...ROW,
	status: (fact) => fact.verdict,
};

// The three comparisons, each in a Section that holds its read as a page ships
// them: the plan change over two columns, the plans over three with a chip on
// every fact, so a painted fact draws a chip's box beside its label, and a data
// layer whose facts carry a verdict, failing, differing, matching or none, so
// its painted facts draw a painted verdict.
function Comparisons(props: { id: string; state: ShowcaseFrame["state"] }) {
	const at = <T,>(name: string, items: readonly T[]) =>
		itemsAt(`${props.id}/${name}`, props.state, items);
	const change = at("change", CHANGE);
	const plans = at("plans", PLANS);
	const layer = at("layer", LAYER);
	return (
		<>
			<Section
				title="Plan change"
				read={change}
				failed="The plan change did not load."
				empty={{
					sentence: "Pick a plan to see what it changes.",
				}}
			>
				<Comparison
					label="Plan change"
					columns={["Current", "After the change"]}
					items={change}
					row={ROW}
				/>
			</Section>
			<Section
				title="Plans"
				read={plans}
				failed="The plans did not load."
				empty={{
					sentence: "Plans on sale land here.",
				}}
			>
				<Comparison
					label="Plans"
					columns={["Free", "Team", "Business"]}
					items={plans}
					row={PLAN_ROW}
				/>
			</Section>
			<Section
				title="Data layer"
				read={layer}
				failed="The data layer did not load."
				empty={{
					sentence: "Observed fields land here.",
				}}
			>
				<Comparison
					label="Data layer"
					columns={["Expected", "Observed"]}
					items={layer}
					row={LAYER_ROW}
				/>
			</Section>
		</>
	);
}

// Every cell draws the comparisons in the frame's state; a `PAINT` cell draws
// them loaded beside the same comparisons painted.
export function drawComparison(frame: ShowcaseFrame) {
	if (isPaint(frame)) {
		if (frame.state !== "rest") return undefined;
		return (
			<Wide>
				<Comparisons id={`${frame.id}/loaded`} state="rest" />
				<Comparisons id={`${frame.id}/painted`} state="loading" />
			</Wide>
		);
	}
	return (
		<Wide>
			<Comparisons id={frame.id} state={frame.state} />
		</Wide>
	);
}
