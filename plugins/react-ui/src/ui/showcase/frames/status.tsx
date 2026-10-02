import type { StatusState } from "@fcalell/ui-core/tokens";
import { Status } from "../../components/status/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

// `STATUS_DOT.state.<state>` draws that state. items-start, so the frame's
// column does not stretch the inline mark.
export function drawStatus(frame: ShowcaseFrame) {
	const [family, axis, value] = frame.cell.name.split(".");
	if (family !== "STATUS_DOT" || axis !== "state") return undefined;
	// The third segment of a `STATUS_DOT.state` cell is a state key.
	const state = value as StatusState;
	return (
		<div className="flex flex-col items-start gap-pair">
			<Status state={state} />
		</div>
	);
}
