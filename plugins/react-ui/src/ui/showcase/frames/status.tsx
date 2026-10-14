import type { StatusState } from "@fcalell/ui-core/tokens";
import { StatusBase } from "../../components/status/base.tsx";
import { Status } from "../../components/status/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { beside, isPaint } from "./painted.tsx";

// `STATUS_DOT.state.<state>` draws that state; `active` draws `running`
// under it, the spinner that stands in the dot's place in the same accent.
// items-start, so the frame's column does not stretch the inline mark.
// `PAINT.kind.box` and `PAINT.kind.glyphs` draw the status beside its painted
// form: the dot's box and a word's filler.
export function drawStatus(frame: ShowcaseFrame) {
	if (isPaint(frame))
		return beside(frame, <Status state="done" />, <StatusBase painted />);
	const [family, axis, value] = frame.cell.name.split(".");
	if (family !== "STATUS_DOT" || axis !== "state") return undefined;
	// The third segment of a `STATUS_DOT.state` cell is a state key.
	const state = value as StatusState;
	return (
		<div className="flex flex-col items-start gap-pair">
			<Status state={state} />
			{state === "active" ? <Status state="running" /> : null}
		</div>
	);
}
