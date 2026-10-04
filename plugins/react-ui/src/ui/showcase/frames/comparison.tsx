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

const ROW = {
	key: (fact: Fact) => fact.label,
	label: (fact: Fact) => fact.label,
	values: (fact: Fact) => fact.values,
};
const PLAN_ROW: FactSlots<PlanFact> = { ...ROW, chips: (fact) => fact.chips };

// Every cell draws both comparisons in the frame's state: the plan change
// over two columns, and the plans over three with a chip on every fact, so a
// waiting fact draws a bar per column and the plans' a chip's bar.
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
		</Wide>
	);
}
