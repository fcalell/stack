import type { Option } from "@fcalell/ui-core/descriptors";
import type { StatusState } from "@fcalell/ui-core/tokens";
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

// Every cell draws the head in the frame's state: at rest a title that
// wraps over one that does not, the lines a pair apart in both, the first
// fact a status that moves; loading the bars in each line's box. A
// `STATUS_DOT.state` cell stands on that state.
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
		</Wide>
	);
}
