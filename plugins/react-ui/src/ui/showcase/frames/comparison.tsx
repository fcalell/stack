import type { StatusMark } from "@fcalell/ui-core/descriptors";
import {
	Comparison,
	type FactSlots,
} from "../../components/comparison/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { queryOf, Wide } from "./layout-context.tsx";

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

// Every cell draws the comparisons in the frame's state: the plan change
// over two columns, the plans over three with a chip on every fact, so a
// waiting fact draws a bar per column and the plans' a chip's bar, and a data
// layer whose facts carry a verdict, failing, differing, matching or none, so
// its waiting facts draw a status bar.
export function drawComparison(frame: ShowcaseFrame) {
	return (
		<Wide>
			<Comparison
				label="Plan change"
				columns={["Current", "After the change"]}
				query={queryOf(frame.state, CHANGE)}
				sentence="The plan change did not load."
				empty={{
					title: "No change",
					sentence: "Pick a plan to see what it changes.",
				}}
				row={ROW}
			/>
			<Comparison
				label="Plans"
				columns={["Free", "Team", "Business"]}
				query={queryOf(frame.state, PLANS)}
				sentence="The plans did not load."
				empty={{
					title: "No plans",
					sentence: "Plans on sale land here.",
				}}
				row={PLAN_ROW}
			/>
			<Comparison
				label="Data layer"
				columns={["Expected", "Observed"]}
				query={queryOf(frame.state, LAYER)}
				sentence="The data layer did not load."
				empty={{
					title: "Nothing observed",
					sentence: "Observed fields land here.",
				}}
				row={LAYER_ROW}
			/>
		</Wide>
	);
}
