import type { ComparisonRow } from "@fcalell/ui-core/descriptors";
import { Comparison } from "../../components/comparison/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

function change(label: string, current: string, next: string): ComparisonRow {
	return {
		label,
		cells: [
			{ label: "Current", value: current },
			{ label: "After the change", value: next },
		],
	};
}

function plans(
	label: string,
	values: [string, string, string],
	chip?: string,
): ComparisonRow {
	return {
		label,
		cells: [
			{ label: "Free", value: values[0] },
			{ label: "Team", value: values[1] },
			{ label: "Business", value: values[2] },
		],
		chips: chip ? [{ label: chip }] : undefined,
	};
}

// Board 51's plan change (two cells) and plans (three, a row with a chip).
const CHANGE = [
	change("Plan", "Team", "Business"),
	change("Seats", "10", "25"),
	change("Storage", "100 GB", "1 TB"),
	change("Audit log", "Not included", "Kept 90 days"),
	change("Billed", "$120 a month", "$480 a month, from 14 October"),
];
const PLANS = [
	plans("Seats", ["3", "10", "Unlimited"]),
	plans("Projects", ["2", "Unlimited", "Unlimited"]),
	plans("Single sign-on", ["No", "No", "Yes"], "Beta"),
	plans("History", ["7 days", "90 days", "Forever"]),
	plans("Support", ["Community", "Email", "Email and chat, same day"]),
];

export function drawComparison(frame: ShowcaseFrame) {
	if (frame.state === "loading")
		return (
			<Wide>
				<Comparison label="Plans" rows={[]} loading />
			</Wide>
		);
	return (
		<Wide>
			<Comparison label="Plan change" rows={CHANGE} />
			<Comparison label="Plans" rows={PLANS} />
		</Wide>
	);
}
