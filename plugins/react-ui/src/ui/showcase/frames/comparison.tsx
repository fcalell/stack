import { Comparison } from "../../components/comparison/index.tsx";
import type { QueryLike } from "../../components/query-boundary/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

interface Fact {
	label: string;
	values: string[];
	chips?: string[];
}

// Board 51's plan change (two columns) and plans (three, a fact with a chip).
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
const PLANS: Fact[] = [
	{ label: "Seats", values: ["3", "10", "Unlimited"] },
	{ label: "Projects", values: ["2", "Unlimited", "Unlimited"] },
	{ label: "Single sign-on", values: ["No", "No", "Yes"], chips: ["Beta"] },
	{ label: "History", values: ["7 days", "90 days", "Forever"] },
	{
		label: "Support",
		values: ["Community", "Email", "Email and chat, same day"],
	},
];

const refetch = () => {};

// A query in the frame's state: its facts at rest, none when empty.
function queryOf(
	state: ShowcaseFrame["state"],
	facts: readonly Fact[],
): QueryLike<readonly Fact[]> {
	let data: readonly Fact[] | undefined;
	if (state === "rest") data = facts;
	if (state === "empty") data = [];
	return {
		data,
		isPending: state === "loading",
		isError: state === "error",
		refetch,
	};
}

const ROW = {
	key: (fact: Fact) => fact.label,
	label: (fact: Fact) => fact.label,
	values: (fact: Fact) => fact.values,
};

// Every cell draws both comparisons in the frame's state: the plan change
// over two columns, and the plans over three with a chips slot, so a waiting
// fact draws a bar per column and the plans' a chips bar.
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
				row={{ ...ROW, chips: (fact) => fact.chips }}
			/>
		</Wide>
	);
}
