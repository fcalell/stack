import type { Option } from "@fcalell/ui-core/descriptors";
import type { StatusState } from "@fcalell/ui-core/tokens";
import { useEffect, useState } from "react";
import { ItemHeader } from "../../components/item-header/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const move = () => {};

// The states the record moves between, each drawn as its status.
const STATES: Option<StatusState>[] = [
	{ value: "waiting", label: "Todo", status: "waiting" },
	{ value: "active", label: "In progress", status: "active" },
	{ value: "attention", label: "Blocked", status: "attention" },
	{ value: "done", label: "Done", status: "done" },
	{ value: "failed", label: "Failed", status: "failed" },
];

const OVERLINE = ["Infra", "ACM-137", "Cycle 14"];
const REST = [{ count: 12, label: "Comments" }, "Ana Ruiz", "Due Oct 4"];

function moving(state: StatusState) {
	return {
		pick: { label: "Status", options: STATES, value: state, onChange: move },
	};
}

type Save = "saving" | "saved" | "failed";

// What follows each save state: a retry starts a save, a save finishes, and a
// finished one is followed by a failed one, so the head cycles the three.
const NEXT: Record<Save, Save> = {
	failed: "saving",
	saving: "saved",
	saved: "failed",
};

// The head rests on a failed save, its retry starting the cycle.
function SavingHead() {
	const [save, setSave] = useState<Save>("failed");
	useEffect(() => {
		if (save === "failed") return;
		const timer = setTimeout(() => setSave(NEXT[save]), 1500);
		return () => clearTimeout(timer);
	}, [save]);
	return (
		<ItemHeader
			overline={OVERLINE}
			title="Describe the meaning of this field"
			facts={[{ save, onRetry: () => setSave(NEXT.failed) }, ...REST]}
		/>
	);
}

// Every cell draws the head in the frame's state: at rest a title that
// wraps over one that does not, the lines a pair apart in both, the first
// fact a status that moves; loading the bars in each line's box. A
// `STATUS_DOT.state` cell stands on that state. A third head carries a save
// fact that cycles its three states, a fourth a fact in words that opens.
export function drawItemHeader(frame: ShowcaseFrame) {
	const [family, , value] = frame.cell.name.split(".");
	// The third segment of a `STATUS_DOT.state` cell is a state key.
	const state = family === "STATUS_DOT" ? (value as StatusState) : "active";
	if (frame.state === "loading")
		return (
			<Wide>
				<ItemHeader title="" loading />
			</Wide>
		);
	return (
		<Wide>
			<ItemHeader
				overline={OVERLINE}
				title="Retry failed webhooks with exponential backoff and a dead-letter queue after five attempts"
				facts={[moving("attention"), ...REST]}
			/>
			<ItemHeader
				overline={OVERLINE}
				title="Fix invoice rounding"
				facts={[moving(state), ...REST]}
			/>
			<SavingHead />
			<ItemHeader
				overline={OVERLINE}
				title="Read the vendor's onboarding email"
				facts={[{ label: "Outside content", onOpen: move }, ...REST]}
			/>
		</Wide>
	);
}
