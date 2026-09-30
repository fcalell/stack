import type { StatusState } from "@fcalell/ui-core/tokens";
import { Status } from "../../components/status/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

const open = () => {};

// `STATUS_DOT.state.<state>` draws that state: at rest the static status over
// the openable pill; hover, focus and active the pill, the pressable form.
// items-start, so the frame's column does not stretch the inline marks.
export function drawStatus(frame: ShowcaseFrame) {
	const drawn = drawCell(frame);
	return (
		drawn && <div className="flex flex-col items-start gap-pair">{drawn}</div>
	);
}

function drawCell(frame: ShowcaseFrame) {
	const [family, axis, value] = frame.cell.name.split(".");
	if (family !== "STATUS_DOT" || axis !== "state") return undefined;
	// The third segment of a `STATUS_DOT.state` cell is a state key.
	const state = value as StatusState;
	if (frame.state !== "rest") return <Status state={state} onOpen={open} />;
	return (
		<>
			<Status state={state} />
			<Status state={state} onOpen={open} />
		</>
	);
}
